import { Telegraf, Context, Markup, session } from 'telegraf';
import LocalSession from 'telegraf-session-local';
import { UserRepository } from '../database/repositories/user.repository';
import { NatalChartRepository } from '../database/repositories/natal-chart.repository';
import { PersonalizedAnalyticsService, PersonalizedDayAnalytics } from './personalized-analytics';
import { createEphemerisCalculator } from '../core/ephemeris';
import { IEphemerisCalculator } from '../core/ephemeris';
import type { DateTime } from '@adaptive-astro/shared/types';
import type { CreateNatalChartInput } from '../database/models';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Ensure env vars are loaded
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;
const EPHEMERIS_API_URL = process.env.EPHEMERIS_API_URL || 'http://localhost:8000';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

if (!TOKEN) {
  console.warn('TELEGRAM_BOT_TOKEN is not set. Bot will not start.');
}

// Define session interface
interface SessionData {
  awaiting?: 'BIRTH_DATE' | 'BIRTH_TIME' | 'CHART_NAME' | 'CHART_TYPE' | null;
  chartCreationFlow?: {
    step: number;
    chartType: 'self' | 'other' | 'event';
    tempData: {
      lat?: number;
      lon?: number;
      timezone?: string;
      birthDate?: string;
      birthTime?: string;
      chartName?: string;
      placeName?: string;
    };
  };
  activeChart?: string; // Currently selected chart ID for /today
}

interface BotContext extends Context {
  session: SessionData;
}

export class TelegramBotService {
  private bot: Telegraf<BotContext>;
  private userRepo: UserRepository;
  private natalRepo: NatalChartRepository;
  private analyticsService!: PersonalizedAnalyticsService;
  private ephemeris!: IEphemerisCalculator;
  private isRunning: boolean = false;
  private static instance: TelegramBotService | null = null;

  constructor() {
    if (!TOKEN) {
       // Placeholder if no token, prevents crash but won't work
       this.bot = new Telegraf('dummy');
       this.userRepo = new UserRepository();
       this.natalRepo = new NatalChartRepository();
       return;
    }

    console.log('🔧 Initializing Telegram Bot Service...');
    this.bot = new Telegraf<BotContext>(TOKEN);

    try {
      this.userRepo = new UserRepository();
      this.natalRepo = new NatalChartRepository();
      this.ephemeris = createEphemerisCalculator();
      this.analyticsService = new PersonalizedAnalyticsService(this.ephemeris);
      console.log('🔧 Repositories and analytics service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize services:', error);
      this.userRepo = new UserRepository();
      this.natalRepo = new NatalChartRepository();
      this.ephemeris = createEphemerisCalculator();
      this.analyticsService = new PersonalizedAnalyticsService(this.ephemeris);
    }

    // Middleware - use different path for local vs docker
    const sessionPath = process.env.NODE_ENV === 'production'
      ? '/app/data/sessions.json'
      : './data/sessions.json';
    const localSession = new LocalSession({ database: sessionPath });
    this.bot.use(localSession.middleware());

    // Commands
    console.log('🔧 Registering bot commands...');
    this.registerCommands();
    console.log('🔧 Bot commands registered successfully');
  }

  private registerCommands() {
    // Enhanced /start command with multi-chart support
    this.bot.start(async (ctx) => {
      console.log('🎯 /start command received from user:', ctx.from.id);
      try {
        const telegramId = ctx.from.id;

        // Initialize or find user
        let user = await this.userRepo.findByTelegramId(telegramId);
        if (!user) {
          user = await this.userRepo.create({
            telegram_id: telegramId,
            username: ctx.from.username,
            metadata: {
              first_name: ctx.from.first_name,
              last_name: ctx.from.last_name,
            }
          });
        }

        // Check if user has any charts
        const charts = await this.natalRepo.findByUserId(user.id);

        if (charts.length > 0) {
          await this.showMainMenu(ctx, charts);
        } else {
          await this.startChartCreation(ctx, 'self');
        }

      } catch (error) {
        console.error('❌ Error in /start command:', error);
        await ctx.reply('Hello! I\'m your Astro Scheduler bot. Something went wrong, but you can try again!');
      }
    });

    // Enhanced Location Handler for chart creation
    this.bot.on('location', async (ctx) => {
      if (!ctx.session.chartCreationFlow) {
        await ctx.reply('Please start with /start or use "Add New Chart" first.');
        return;
      }

      const { latitude, longitude } = ctx.message.location;
      ctx.session.chartCreationFlow.tempData.lat = latitude;
      ctx.session.chartCreationFlow.tempData.lon = longitude;

      try {
        const tzResponse = await axios.post(`${EPHEMERIS_API_URL}/api/v1/geo/timezone`, {
          latitude, longitude
        });

        const timezone = tzResponse.data.timezone;
        const placeName = tzResponse.data.place_name || `${latitude}, ${longitude}`;

        ctx.session.chartCreationFlow.tempData.timezone = timezone;
        ctx.session.chartCreationFlow.tempData.placeName = placeName;
        ctx.session.chartCreationFlow.step = 2;
        ctx.session.awaiting = 'BIRTH_DATE';

        await ctx.reply(
          `Got it! 📍\nLocation: ${placeName}\nTimezone: ${timezone}\n\n` +
          `Now, please enter the birth date (YYYY-MM-DD):`,
          Markup.removeKeyboard()
        );
      } catch (error) {
        console.error('Timezone Error:', error);
        await ctx.reply("I couldn't detect the timezone for that location. Please try sharing the location again.");
      }
    });

    // Enhanced Text Handler for comprehensive chart creation workflow
    this.bot.on('text', async (ctx) => {
      if (!ctx.session.awaiting) return;

      const text = ctx.message.text.trim();

      if (ctx.session.awaiting === 'BIRTH_DATE') {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(text)) {
          return ctx.reply('Please use the format YYYY-MM-DD (e.g. 1990-05-25)');
        }

        ctx.session.chartCreationFlow!.tempData.birthDate = text;
        ctx.session.chartCreationFlow!.step = 3;
        ctx.session.awaiting = 'BIRTH_TIME';

        return ctx.reply('Perfect! Now enter the birth time (HH:MM) - use 24h format (e.g. 14:30):');
      }

      if (ctx.session.awaiting === 'BIRTH_TIME') {
        const timeRegex = /^\d{2}:\d{2}$/;
        if (!timeRegex.test(text)) {
          return ctx.reply('Please use the format HH:MM (e.g. 14:30)');
        }

        ctx.session.chartCreationFlow!.tempData.birthTime = text + ':00';
        ctx.session.chartCreationFlow!.step = 4;
        ctx.session.awaiting = 'CHART_NAME';

        const chartType = ctx.session.chartCreationFlow!.chartType;
        const defaultName = chartType === 'self' ? 'My Chart' : 'Chart';

        return ctx.reply(
          `Great! Finally, what would you like to name this chart?\n\n` +
          `You can just type "${defaultName}" or choose a custom name:`
        );
      }

      if (ctx.session.awaiting === 'CHART_NAME') {
        ctx.session.chartCreationFlow!.tempData.chartName = text;
        ctx.session.awaiting = null;

        await this.createAndSaveChart(ctx);
      }
    });

    // Enhanced /today command with personalized readings
    this.bot.command('today', async (ctx) => {
      console.log('🎯 /today command received from user:', ctx.from.id);
      console.log('🔍 Processing /today command...');

      try {
        const telegramId = ctx.from.id;
        const user = await this.userRepo.findByTelegramId(telegramId);

        if (!user) {
          await ctx.reply('Please start with /start first to create your natal chart.');
          return;
        }

        // Get user's charts
        const charts = await this.natalRepo.findByUserId(user.id);

        if (charts.length === 0) {
          await ctx.reply(
            'You don\'t have any natal charts yet! 📊\n\n' +
            'I need your birth information to give you personalized readings. Let\'s create your chart now!',
            Markup.inlineKeyboard([
              [Markup.button.callback('✨ Create My Chart', 'add_self')]
            ])
          );
          return;
        }

        // If multiple charts, let user choose
        if (charts.length > 1 && !ctx.session.activeChart) {
          await this.showChartSelector(ctx, 'today');
          return;
        }

        // Get the chart to use
        const chartId = ctx.session.activeChart || charts[0].id;
        await this.generateTodayReading(ctx, chartId);

      } catch (error) {
        console.error('❌ Error in /today command:', error);
        await ctx.reply('Sorry, I couldn\'t generate your reading right now. Please try again later.');
      }
    });

    // /charts command - list all charts
    this.bot.command('charts', async (ctx) => {
      try {
        const telegramId = ctx.from?.id;
        if (!telegramId) {
          await ctx.reply('Error: Unable to identify user');
          return;
        }

        const user = await this.userRepo.findByTelegramId(telegramId);
        if (!user) {
          await ctx.reply('Please start with /start first.');
          return;
        }

        const charts = await this.natalRepo.findByUserId(user.id);

        if (charts.length === 0) {
          await ctx.reply('You don\'t have any charts yet. Use /start to create one!');
          return;
        }

        let text = `📊 *Your Natal Charts* (${charts.length})\n\n`;
        charts.forEach((chart, index) => {
          const date = chart.birth_date.toISOString().split('T')[0];
          text += `${index + 1}. *${chart.name}*\n`;
          text += `   📅 ${date}\n`;
          text += `   📍 ${chart.birth_location.placeName || 'Location'}\n\n`;
        });

        await ctx.reply(text, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '➕ Add New Chart', callback_data: 'add_chart' }],
              [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
            ]
          }
        });

      } catch (error) {
        console.error('Error in /charts command:', error);
        await ctx.reply('Error loading your charts.');
      }
    });

    // Generic event chart command
    this.bot.command('event', async (ctx) => {
      console.log('🎯 /event command received from user:', ctx.from.id);
      try {
        const telegramId = ctx.from.id;
        let user = await this.userRepo.findByTelegramId(telegramId);

        if (!user) {
          user = await this.userRepo.create({
            telegram_id: telegramId,
            username: ctx.from.username,
            metadata: {
              first_name: ctx.from.first_name,
              last_name: ctx.from.last_name,
            }
          });
        }

        // Initialize event chart creation flow
        ctx.session.chartCreationFlow = {
          step: 1,
          chartType: 'event',
          tempData: {}
        };

        await ctx.reply(
          "🌟 Let's create an event chart!\n\n" +
          "Event charts capture the cosmic energy of any significant moment - launches, meetings, decisions, or any moment you want to understand astrologically.\n\n" +
          "First, I need the location where this event happened (or will happen).",
          Markup.keyboard([
            [Markup.button.locationRequest('📍 Share Location')],
            [Markup.button.text('❌ Cancel')]
          ]).resize()
        );

      } catch (error) {
        console.error('❌ Error in /event command:', error);
        await ctx.reply('Sorry, something went wrong. Please try again.');
      }
    });

    // Enhanced help command
    this.bot.command('help', async (ctx) => {
      try {
        await ctx.reply(
          "🤖 *Astro Scheduler Commands:*\n\n" +
          "/start - Begin setup or create your natal chart\n" +
          "/today - Get personalized daily reading\n" +
          "/charts - View and manage all your charts\n" +
          "/event - Create an event chart for any moment\n" +
          "/help - Show this help message\n\n" +
          "✨ I can create natal charts (birth) and event charts (any significant moment) to provide astrological insights!",
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.error('Error in /help command:', error);
        await ctx.reply('Available commands: /start, /today, /charts, /event, /help');
      }
    });

    // Add comprehensive callback handlers after commands
    this.addCallbackHandlers();
  }

  private async showMainMenu(ctx: BotContext, charts: any[]) {
    const keyboard = [
      [Markup.button.callback('📊 Today\'s Reading', 'today')],
      [Markup.button.callback('➕ Add New Chart', 'add_chart')],
      [Markup.button.callback('📋 Manage Charts', 'manage_charts')],
    ];

    await ctx.reply(
      `Welcome back ${ctx.from?.first_name || 'there'}! 🌟\n\n` +
      `You have ${charts.length} natal chart${charts.length > 1 ? 's' : ''} stored.\n\n` +
      `What would you like to do today?`,
      Markup.inlineKeyboard(keyboard)
    );
  }

  private async startChartCreation(ctx: BotContext, chartType: 'self' | 'other' | 'event') {
    ctx.session.chartCreationFlow = {
      step: 1,
      chartType,
      tempData: {}
    };

    const message = chartType === 'self'
      ? "Let's create your personal natal chart! 🌟\nFirst, I need your birth location."
      : "Let's create a new natal chart! 🌟\nFirst, I need the birth location.";

    await ctx.reply(
      message,
      Markup.keyboard([
        Markup.button.locationRequest('📍 Share Location')
      ]).resize().oneTime()
    );
  }

  private async showChartSelector(ctx: BotContext, action: 'today' | 'manage') {
    const telegramId = ctx.from?.id;
    if (!telegramId) {
      await ctx.reply('Error: Unable to identify user');
      return;
    }

    const user = await this.userRepo.findByTelegramId(telegramId);

    if (!user) {
      await ctx.reply('Please start with /start first');
      return;
    }

    const charts = await this.natalRepo.findByUserId(user.id);

    if (charts.length === 0) {
      await ctx.reply('You don\'t have any charts yet. Let\'s create one!');
      await this.startChartCreation(ctx, 'self');
      return;
    }

    const keyboard = charts.map(chart => [
      Markup.button.callback(
        `${chart.name} (${chart.birth_date.toISOString().split('T')[0]})`,
        `${action}_${chart.id}`
      )
    ]);

    await ctx.reply(
      `Select a chart:`,
      Markup.inlineKeyboard(keyboard)
    );
  }

  private async createAndSaveChart(ctx: BotContext) {
    if (!ctx.session.chartCreationFlow) return;

    const { tempData, chartType } = ctx.session.chartCreationFlow;
    const telegramId = ctx.from?.id;
    if (!telegramId) {
      await ctx.reply('Error: Unable to identify user');
      return;
    }

    await ctx.reply('Calculating natal chart... ✨ This may take a moment...');

    try {
      // 1. Get User
      const user = await this.userRepo.findByTelegramId(telegramId);
      if (!user) throw new Error('User not found');

      // 2. Create DateTime object for birth moment
      const birthDateTime: DateTime = {
        date: new Date(`${tempData.birthDate}T${tempData.birthTime}`),
        timezone: tempData.timezone!,
        location: {
          latitude: tempData.lat!,
          longitude: tempData.lon!,
        },
      };

      // 3. Calculate natal chart data (parallel requests for speed)
      const [planets, houses, aspects, lunarDay, moonPhase] = await Promise.all([
        this.ephemeris.getPlanetsPositions(birthDateTime),
        this.ephemeris.getHouses(birthDateTime, 'placidus'),
        this.ephemeris.getAspects(birthDateTime, 8),
        this.ephemeris.getLunarDay(birthDateTime),
        this.ephemeris.getMoonPhase(birthDateTime),
      ]);

      // 4. Create chart input based on type
      const chartInput: CreateNatalChartInput = {
        user_id: user.id,
        name: tempData.chartName!,
        birth_date: new Date(`${tempData.birthDate}T${tempData.birthTime}`),
        birth_time: tempData.birthTime!,
        birth_location: {
          latitude: tempData.lat!,
          longitude: tempData.lon!,
          timezone: tempData.timezone!,
          placeName: tempData.placeName,
        },
        planets: planets.planets as any[], // Convert API data to expected format
        houses: houses.houses as any[], // Convert API data to expected format
        aspects: aspects.aspects as any[], // Convert API data to expected format
        lunar_day: lunarDay,
        moon_phase: moonPhase.toString(), // Convert number to string for database
        house_system: 'placidus',
      };

      // 5. Save to database
      const natalChart = await this.natalRepo.create(chartInput);

      // 6. Set as active chart if it's the user's first chart
      const userCharts = await this.natalRepo.findByUserId(user.id);
      if (userCharts.length === 1) {
        ctx.session.activeChart = natalChart.id;
      }

      // 7. Success response
      const chartTypeText = chartType === 'event' ? 'event chart' : 'natal chart';
      const chartEmoji = chartType === 'event' ? '⭐' : '🎉';

      await ctx.reply(
        `${chartEmoji} ${chartTypeText} "${tempData.chartName}" created successfully!\n\n` +
        `📅 ${chartType === 'event' ? 'Event' : 'Birth'}: ${tempData.birthDate} at ${tempData.birthTime?.slice(0, 5)}\n` +
        `📍 Location: ${tempData.placeName}\n\n` +
        `You can now view it in /charts or get insights with /today!`,
        Markup.inlineKeyboard([
          [Markup.button.callback('📊 Get Today\'s Reading', 'today')],
          [Markup.button.callback('📋 View All Charts', 'charts')],
          [Markup.button.callback('🏠 Main Menu', 'main_menu')]
        ])
      );

      // 8. Clear session
      ctx.session.chartCreationFlow = undefined;

    } catch (error) {
      console.error('Chart creation error:', error);
      await ctx.reply(
        '❌ Sorry, there was an error creating your chart. Please try again with /start.\n\n' +
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );

      // Clear session on error
      ctx.session.chartCreationFlow = undefined;
      ctx.session.awaiting = null;
    }
  }

  private async generateTodayReading(ctx: BotContext, chartId: string) {
    try {
      await ctx.reply('🔮 Generating your personalized reading... ✨');

      // Get the natal chart
      const natalChart = await this.natalRepo.findById(chartId);
      if (!natalChart) {
        await ctx.reply('Chart not found. Please use /start to create a new one.');
        return;
      }

      // Generate today's analytics
      const today = new Date();
      const analytics = await this.analyticsService.generateDayAnalytics(
        natalChart,
        today
      );

      // Format the reading
      const readingText = this.formatDailyReading(analytics, natalChart);

      // Send reading with options
      await ctx.reply(
        readingText,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🔮 View Transits', callback_data: `transits_${chartId}` },
                { text: '📊 Activities', callback_data: `activities_${chartId}` }
              ],
              [
                { text: '🔄 Refresh', callback_data: `today_${chartId}` },
                { text: '🏠 Menu', callback_data: 'main_menu' }
              ]
            ]
          }
        }
      );

      console.log('✅ /today reading generated successfully');

    } catch (error) {
      console.error('❌ Error generating today reading:', error);
      await ctx.reply(
        'Sorry, I couldn\'t generate your personalized reading right now. ' +
        'The astrological calculation service might be temporarily unavailable.'
      );
    }
  }

  private formatDailyReading(analytics: PersonalizedDayAnalytics, chart: any): string {
    const date = analytics.date.toISOString().split('T')[0];
    const score = Math.round(analytics.overallScore);

    let scoreEmoji = '🌟';
    if (score >= 80) scoreEmoji = '✨';
    else if (score >= 60) scoreEmoji = '⭐';
    else if (score >= 40) scoreEmoji = '🌙';
    else scoreEmoji = '🌑';

    let text = `📅 *${chart.name}* - Today's Energy (${date}) ${scoreEmoji}\n\n`;

    text += `*Overall Score:* ${score}/100\n\n`;

    text += `🌙 *Lunar Day:* ${analytics.universalEnergy.lunarDay} (${analytics.universalEnergy.moonPhase})\n\n`;

    text += `*Personal Summary:*\n${analytics.personalSummary}\n\n`;

    if (analytics.recommendations.bestActivities.length > 0) {
      text += `✅ *Best Activities:*\n`;
      analytics.recommendations.bestActivities.forEach(activity => {
        text += `• ${activity}\n`;
      });
      text += '\n';
    }

    if (analytics.recommendations.avoid.length > 0) {
      text += `⚠️ *Avoid:*\n`;
      analytics.recommendations.avoid.forEach(item => {
        text += `• ${item}\n`;
      });
      text += '\n';
    }

    if (analytics.recommendations.energyFocus.length > 0) {
      text += `🎯 *Energy Focus:*\n`;
      analytics.recommendations.energyFocus.forEach(focus => {
        text += `• ${focus}\n`;
      });
    }

    return text;
  }

  private async showTransitDetails(ctx: BotContext, chartId: string) {
    try {
      const natalChart = await this.natalRepo.findById(chartId);
      if (!natalChart) return;

      const analytics = await this.analyticsService.generateDayAnalytics(natalChart);
      const transits = analytics.personalTransits;

      let text = `🌍 *Current Transits* for ${natalChart.name}\n\n`;

      if (transits.significantTransits.length > 0) {
        text += `*Significant Aspects:*\n`;
        transits.significantTransits.slice(0, 5).forEach(transit => {
          const orb = transit.orb.toFixed(1);
          text += `• ${transit.transitingPlanet} ${transit.aspectType} ${transit.natalPlanet} (${orb}°)\n`;
        });
      } else {
        text += `No major transits active today.\n`;
      }

      await ctx.reply(text, { parse_mode: 'Markdown' });
      await ctx.answerCbQuery();

    } catch (error) {
      console.error('Error showing transit details:', error);
      await ctx.answerCbQuery('Error loading transit details');
    }
  }

  private async showActivityRecommendations(ctx: BotContext, chartId: string) {
    try {
      const natalChart = await this.natalRepo.findById(chartId);
      if (!natalChart) return;

      // Define common activities to score
      const activities = [
        'Важные переговоры',
        'Новые проекты',
        'Финансовые решения',
        'Романтические встречи',
        'Спортивная активность',
        'Обучение и курсы',
        'Медитация',
        'Творческая работа'
      ];

      const recommendations = await this.analyticsService.scoreActivities(
        natalChart,
        activities
      );

      let text = `📊 *Activity Recommendations* for ${natalChart.name}\n\n`;

      recommendations.slice(0, 6).forEach((rec, index) => {
        const emoji = index < 2 ? '🟢' : index < 4 ? '🟡' : '🔴';
        text += `${emoji} *${rec.activity}*: ${rec.score}/100\n`;
      });

      await ctx.reply(text, { parse_mode: 'Markdown' });
      await ctx.answerCbQuery();

    } catch (error) {
      console.error('Error showing activity recommendations:', error);
      await ctx.answerCbQuery('Error loading recommendations');
    }
  }

  private addCallbackHandlers() {
    // Pattern-based callback handlers
    this.bot.action(/^(.+)_(.+)$/, async (ctx) => {
      const [, action, data] = ctx.match;

      try {
        switch (action) {
          case 'today':
            await this.generateTodayReading(ctx, data);
            break;

          case 'add':
            if (data === 'self') {
              await this.startChartCreation(ctx, 'self');
            } else if (data === 'other') {
              await this.startChartCreation(ctx, 'other');
            }
            break;

          case 'transits':
            await this.showTransitDetails(ctx, data);
            break;

          case 'activities':
            await this.showActivityRecommendations(ctx, data);
            break;

          default:
            await ctx.answerCbQuery('Unknown action');
        }
      } catch (error) {
        console.error('Callback error:', error);
        await ctx.answerCbQuery('Error processing request');
      }
    });

    // Single action handlers
    this.bot.action('main_menu', async (ctx) => {
      const telegramId = ctx.from?.id;
      if (telegramId) {
        const user = await this.userRepo.findByTelegramId(telegramId);
        if (user) {
          const charts = await this.natalRepo.findByUserId(user.id);
          await this.showMainMenu(ctx, charts);
        }
      }
      await ctx.answerCbQuery();
    });

    this.bot.action('today', async (ctx) => {
      const telegramId = ctx.from?.id;
      if (!telegramId) {
        await ctx.reply('Error: Unable to identify user');
        return;
      }

      const user = await this.userRepo.findByTelegramId(telegramId);
      if (!user) {
        await ctx.reply('Please start with /start first.');
        return;
      }

      const charts = await this.natalRepo.findByUserId(user.id);
      if (charts.length === 0) {
        await this.startChartCreation(ctx, 'self');
      } else if (charts.length === 1) {
        await this.generateTodayReading(ctx, charts[0].id);
      } else {
        await this.showChartSelector(ctx, 'today');
      }
      await ctx.answerCbQuery();
    });

    this.bot.action('add_chart', async (ctx) => {
      await ctx.reply(
        'What type of chart would you like to add?',
        Markup.inlineKeyboard([
          [Markup.button.callback('👤 My Chart', 'add_self')],
          [Markup.button.callback('👥 Someone Else\'s Chart', 'add_other')],
          [Markup.button.callback('⬅️ Back', 'main_menu')]
        ])
      );
      await ctx.answerCbQuery();
    });

    this.bot.action('manage_charts', async (ctx) => {
      await this.showChartSelector(ctx, 'manage');
      await ctx.answerCbQuery();
    });
  }

  public async launch() {
    if (!TOKEN) {
      console.log('❌ No bot token provided, skipping bot launch');
      return;
    }

    console.log('🚀 Launching Telegram Bot...');

    try {
      // Clear any existing webhooks first to avoid conflicts
      console.log('🧹 Clearing webhooks to ensure clean polling start...');
      await this.bot.telegram.deleteWebhook();
      
      // Wait a moment for webhook cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Set bot commands with Telegram API
      await this.setBotCommands();

      // Add debug logging for bot startup
      console.log('🔧 Bot instance created with token:', TOKEN ? 'Present' : 'Missing');
      
      // For now, always use polling mode since we don't have HTTPS webhook setup
      console.log('🔄 Using polling mode with timeout handling...');
      
      // Launch with explicit timeout and retry logic
      const launchPromise = this.bot.launch({
        dropPendingUpdates: true // Clear any pending updates
      });
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Bot launch timeout after 15 seconds')), 15000);
      });
      
      await Promise.race([launchPromise, timeoutPromise]);
      
      console.log('🤖 Telegram Bot started in polling mode!');
      console.log('📞 Bot is now listening for messages...');
      console.log('🎯 Enhanced Telegram bot with natal chart management is LIVE!');
      
      // Test bot connectivity immediately after launch
      console.log('🔍 Testing bot connectivity...');
      const me = await this.bot.telegram.getMe();
      console.log('✅ Bot connected successfully:', me.username);
      
      // Test if we can get updates
      console.log('🔍 Testing update retrieval...');
      const updates = await this.bot.telegram.getUpdates({ limit: 1 });
      console.log('📡 Update check successful, pending updates:', updates.length);
      
    } catch (err: any) {
      console.error('❌ Failed to launch Telegram Bot:', err);
      console.error('Bot token valid:', TOKEN ? 'Yes' : 'No');
      console.error('Error details:', err?.message || 'Unknown error');
      if (err?.stack) console.error('Stack trace:', err.stack);
      
      // Try to recover with a different approach
      console.log('🔄 Attempting recovery with manual polling setup...');
      try {
        await this.setupManualPolling();
      } catch (recoveryErr: any) {
        console.error('❌ Recovery attempt failed:', recoveryErr?.message);
      }
    }

    // Enable graceful stop
    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }

  private async setupManualPolling() {
    console.log('🔧 Setting up manual polling as fallback...');
    
    let offset = 0;
    const pollForUpdates = async () => {
      try {
        const updates = await this.bot.telegram.getUpdates({
          offset,
          timeout: 10,
          limit: 100
        });
        
        for (const update of updates) {
          try {
            await this.bot.handleUpdate(update);
            offset = update.update_id + 1;
          } catch (updateErr: any) {
            console.error('❌ Error processing update:', updateErr?.message);
          }
        }
        
        // Continue polling
        setTimeout(pollForUpdates, 100);
        
      } catch (pollErr: any) {
        console.error('❌ Polling error:', pollErr?.message);
        // Retry after delay
        setTimeout(pollForUpdates, 5000);
      }
    };
    
    console.log('✅ Starting manual polling loop...');
    pollForUpdates();
  }

  private async setBotCommands() {
    try {
      const commands = [
        { command: 'start', description: 'Begin setup or create your natal chart' },
        { command: 'today', description: 'Get personalized daily reading' },
        { command: 'charts', description: 'View and manage all your charts' },
        { command: 'event', description: 'Create an event chart for any moment' },
        { command: 'help', description: 'Show help message' }
      ];

      await this.bot.telegram.setMyCommands(commands);
      console.log('✅ Bot commands set with Telegram API');
    } catch (error) {
      console.error('❌ Failed to set bot commands:', error);
    }
  }

  private async setupWebhook() {
    try {
      await this.bot.telegram.setWebhook(WEBHOOK_URL!);
      console.log(`🤖 Telegram Bot webhook set to: ${WEBHOOK_URL}`);
    } catch (error) {
      console.error('Failed to set webhook:', error);
    }
  }

  public handleWebhook(req: any, res: any) {
    if (!TOKEN) {
      res.status(500).send('Bot not configured');
      return;
    }

    try {
      // Handle the update and respond
      this.bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).send('Webhook processing failed');
    }
  }

  private async generateEventChart(eventData: any) {
    const user = eventData.user;
    const tempData = eventData.tempData;

    // Create DateTime object for the event moment
    const eventDateTime: DateTime = {
      date: new Date(`${tempData.birthDate}T${tempData.birthTime}`),
      timezone: tempData.timezone!,
      location: {
        latitude: tempData.lat!,
        longitude: tempData.lon!,
      },
    };

    // Use the same calculation as natal chart but store as event type
    const [planets, houses, aspects, lunarDay, moonPhase] = await Promise.all([
      this.ephemeris.getPlanetsPositions(eventDateTime),
      this.ephemeris.getHouses(eventDateTime, 'placidus'),
      this.ephemeris.getAspects(eventDateTime, 8),
      this.ephemeris.getLunarDay(eventDateTime),
      this.ephemeris.getMoonPhase(eventDateTime),
    ]);

    const chartInput = {
      user_id: user.id,
      name: tempData.chartName || 'Event Chart',
      birth_date: tempData.birthDate,
      birth_time: tempData.birthTime,
      birth_location: {
        latitude: tempData.lat,
        longitude: tempData.lon,
        timezone: tempData.timezone,
        placeName: tempData.placeName,
      },
      planets: planets.planets as any[],
      houses: houses.houses as any[],
      aspects: aspects.aspects as any[],
      lunar_day: lunarDay,
      moon_phase: moonPhase.toString(),
      house_system: 'placidus',
    };

    return await this.natalRepo.create(chartInput);
  }

  public static setInstance(instance: TelegramBotService) {
    this.instance = instance;
  }
}
