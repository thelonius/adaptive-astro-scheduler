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
  awaiting?: 'BIRTH_DATE' | 'BIRTH_TIME' | 'CHART_NAME' | 'CHART_TYPE' | 'CITY_NAME' | null;
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
        console.log('🔄 Processing /start for user:', telegramId);

        // Initialize or find user
        let user = await this.userRepo.findByTelegramId(telegramId);
        if (!user) {
          console.log('📝 Creating new user for telegram ID:', telegramId);
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
        console.log(`📊 User has ${charts.length} charts`);

        if (charts.length > 0) {
          console.log('📋 Showing main menu to user');
          await this.showMainMenu(ctx, charts);
        } else {
          console.log('🆕 Starting chart creation for new user');
          await this.startChartCreation(ctx, 'self');
        }
        console.log('✅ /start command completed successfully');

      } catch (error) {
        console.error('❌ Error in /start command:', error);
        try {
          await ctx.reply('Hello! I\'m your Astro Scheduler bot. Something went wrong, but you can try again!');
          console.log('✅ Error message sent to user');
        } catch (replyError) {
          console.error('❌ Failed to send error message:', replyError);
        }
      }
    });

    // Enhanced Location Handler for chart creation
    this.bot.on('location', async (ctx) => {
      console.log('📍 Location message received from user:', ctx.from.id);
      console.log('📍 Location data:', ctx.message.location);
      console.log('📍 Session state:', ctx.session?.chartCreationFlow ? 'Flow exists' : 'No flow found');

      if (!ctx.session.chartCreationFlow) {
        console.log('❌ No chart creation flow - asking user to restart');
        await ctx.reply('Please start with /start or use "Add New Chart" first.');
        return;
      }

      const { latitude, longitude } = ctx.message.location;
      ctx.session.chartCreationFlow.tempData.lat = latitude;
      ctx.session.chartCreationFlow.tempData.lon = longitude;

      console.log('📍 Processing location:', { latitude, longitude });

      try {
        // Instead of automatically calling timezone API, ask user to confirm city
        await ctx.reply(
          `📍 Location received: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}\n\n` +
          `Please type the name of your city (e.g., "New York", "London", "Tokyo"):\n\n` +
          `This helps ensure accurate timezone and location data for your chart.`,
          Markup.removeKeyboard()
        );

        // Set up to await city name
        ctx.session.awaiting = 'CITY_NAME';
        ctx.session.chartCreationFlow.step = 1.5; // Between location and birth date
        console.log('✅ Location received, waiting for city confirmation');

      } catch (error) {
        console.error('❌ Location processing error:', error);
        await ctx.reply("There was an error processing your location. Please try sharing it again.");
      }
    });

    // Enhanced Text Handler for comprehensive chart creation workflow
    this.bot.on('text', async (ctx) => {
      if (!ctx.session.awaiting) return;

      const text = ctx.message.text.trim();

      if (ctx.session.awaiting === 'CITY_NAME') {
        console.log('🏙️ City name received:', text);

        if (!ctx.session.chartCreationFlow) {
          await ctx.reply('Please start with /start first.');
          return;
        }

        try {
          // Use city name with coordinates for timezone lookup
          const { lat, lon } = ctx.session.chartCreationFlow.tempData;

          console.log('🏙️ Looking up timezone for city:', text, 'at coordinates:', lat, lon);

          // Try timezone lookup with coordinates
          const tzResponse = await axios.post(`${EPHEMERIS_API_URL}/api/v1/geo/timezone`, {
            latitude: lat,
            longitude: lon
          });

          const timezone = tzResponse.data.timezone;
          console.log('🏙️ Timezone found:', timezone);

          // Store city name and timezone
          ctx.session.chartCreationFlow.tempData.timezone = timezone;
          ctx.session.chartCreationFlow.tempData.placeName = text;
          ctx.session.chartCreationFlow.step = 2;
          ctx.session.awaiting = 'BIRTH_DATE';

          await ctx.reply(
            `Perfect! 📍\nCity: ${text}\nTimezone: ${timezone}\n\n` +
            `Now, please enter the birth date (YYYY-MM-DD):`
          );
          console.log('✅ City and timezone processed successfully');

        } catch (error) {
          console.error('❌ Timezone lookup failed:', error);
          await ctx.reply(
            `I couldn't determine the timezone for "${text}". ` +
            `Please try entering the city name again, or try a nearby major city.`
          );
        }
        return;
      }

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
              ...charts.map(c => [{ text: `🔍 View Details: ${c.name}`, callback_data: `details_${c.id}` }]),
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
      `Select a chart to ${action === 'today' ? 'get daily reading' : 'manage'}:`,
      Markup.inlineKeyboard([
        ...keyboard,
        [Markup.button.callback('🏠 Main Menu', 'main_menu')]
      ])
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
                { text: '📊 Activities', callback_data: `activities_${chartId}` },
                { text: '🔍 Natal Details', callback_data: `details_${chartId}` }
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

    // Add detailed transit information
    text += this.formatTransitDetails(analytics.personalTransits);

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

  private formatTransitDetails(transits: any): string {
    let transitText = `🌍 *Current Transits* (Maximum Detail)\n\n`;

    // Major Aspects (Significant Transits)
    if (transits.significantTransits && transits.significantTransits.length > 0) {
      transitText += `⭐ *Major Aspects Active:*\n`;
      transits.significantTransits.forEach((transit: any) => {
        const orb = transit.orb?.toFixed(1) || '0.0';
        const exactness = transit.isExact ? ' ⚡ EXACT' : transit.isApplying ? ' ↗️ Applying' : ' ↘️ Separating';
        const strength = transit.orb <= 1 ? '🔥' : transit.orb <= 3 ? '🌟' : '✨';

        transitText += `${strength} *${transit.transitingPlanet}* ${this.getAspectSymbol(transit.aspectType)} *${transit.natalPlanet}*\n`;
        transitText += `   Orb: ${orb}°${exactness}\n`;
        if (transit.interpretation) {
          transitText += `   _${transit.interpretation}_\n`;
        }
        transitText += `\n`;
      });
    }

    // All Active Transits (Minor Aspects)
    if (transits.transits && transits.transits.length > 0) {
      const minorTransits = transits.transits.filter((t: any) =>
        !['conjunction', 'square', 'trine', 'opposition'].includes(t.aspectType)
      );

      if (minorTransits.length > 0) {
        transitText += `🔮 *Minor Aspects:*\n`;
        minorTransits.slice(0, 8).forEach((transit: any) => {
          const orb = transit.orb?.toFixed(1) || '0.0';
          const exactness = transit.isExact ? ' ⚡' : transit.isApplying ? ' ↗️' : ' ↘️';

          transitText += `• ${transit.transitingPlanet} ${this.getAspectSymbol(transit.aspectType)} ${transit.natalPlanet} (${orb}°)${exactness}\n`;
        });
        transitText += `\n`;
      }
    }

    // House Transits
    if (transits.houseTransits && transits.houseTransits.length > 0) {
      transitText += `🏠 *House Transits:*\n`;
      transits.houseTransits.slice(0, 6).forEach((hTransit: any) => {
        transitText += `• *${hTransit.planet}* in ${this.getHouseName(hTransit.natalHouse)} House\n`;
        if (hTransit.interpretation) {
          transitText += `   _${hTransit.interpretation}_\n`;
        }
      });
      transitText += `\n`;
    }

    // Retrograde Influences  
    if (transits.retrogradeInfluences && transits.retrogradeInfluences.length > 0) {
      transitText += `↩️ *Retrograde Influences:*\n`;
      transits.retrogradeInfluences.forEach((retro: any) => {
        transitText += `• *${retro.planet}* ℞ affecting: ${retro.affectedNatalPlanets.join(', ')}\n`;
      });
      transitText += `\n`;
    }

    // Transit Summary
    if (transits.summary) {
      transitText += `📝 *Transit Summary:*\n_${transits.summary}_\n\n`;
    }

    return transitText;
  }

  private getAspectSymbol(aspectType: string): string {
    const symbols: { [key: string]: string } = {
      'conjunction': '☌',
      'sextile': '⚹',
      'square': '□',
      'trine': '△',
      'quincunx': '⚻',
      'opposition': '☍'
    };
    return symbols[aspectType] || aspectType;
  }

  private getHouseName(houseNumber: number): string {
    const names = [
      '', '1st', '2nd', '3rd', '4th', '5th', '6th',
      '7th', '8th', '9th', '10th', '11th', '12th'
    ];
    return names[houseNumber] || `${houseNumber}th`;
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

  private async showChartDetails(ctx: BotContext, chartId: string) {
    try {
      const chart = await this.natalRepo.findById(chartId);
      if (!chart) {
        await ctx.answerCbQuery('Chart not found');
        return;
      }

      let text = `🔍 *Natal Chart: ${chart.name}*\n`;
      text += `📅 ${chart.birth_date.toISOString().split('T')[0]} at ${chart.birth_time.slice(0, 5)}\n`;
      text += `📍 ${chart.birth_location.placeName || 'Location'}\n\n`;

      text += `🪐 *Planetary Positions:*\n`;
      if (Array.isArray(chart.planets)) {
        chart.planets.forEach((p: any) => {
          const name = p.name || p.planet || 'Unknown';
          const sign = p.zodiac_sign?.name || p.sign || 'Unknown';
          const deg = typeof p.longitude === 'number' ? Math.floor(p.longitude % 30) : p.degree;
          const min = typeof p.longitude === 'number' ? Math.floor((p.longitude % 1) * 60) : (p.minute || 0);
          const retro = p.is_retrograde ? ' ℞' : '';

          text += `• *${name}*: ${sign} ${deg}°${min}'${retro}\n`;
        });
      }

      text += `\n🏠 *Houses:*\n`;
      if (Array.isArray(chart.houses)) {
        // Show major houses if they exist or just the list
        chart.houses.forEach((h: any) => {
          const num = h.number || h.house;
          const sign = h.cusp_sign?.name || h.sign || 'Unknown';
          const deg = typeof h.cusp_longitude === 'number' ? Math.floor(h.cusp_longitude % 30) : (h.degree || 0);

          text += `H${num}: ${sign} ${deg}°\n`;
        });
      }

      await ctx.reply(text, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔮 Get Today\'s Reading', callback_data: `today_${chartId}` }],
            [{ text: '⬅️ Back to Charts', callback_data: 'charts' }]
          ]
        }
      });
      await ctx.answerCbQuery();

    } catch (error) {
      console.error('Error showing chart details:', error);
      await ctx.answerCbQuery('Error loading chart details');
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

          case 'details':
            await this.showChartDetails(ctx, data);
            break;

          case 'manage':
            // Show options for a specific chart
            await ctx.reply(`Manage *${data}*`, {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔍 View Details', callback_data: `details_${data}` }],
                  [{ text: '📊 Get Reading', callback_data: `today_${data}` }],
                  [{ text: '🏠 Menu', callback_data: 'main_menu' }]
                ]
              }
            });
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

      // Try a custom implementation with manual getUpdates and shorter timeout
      console.log('🔄 Starting custom polling with shorter timeout intervals...');

      // Important: Initialize middleware first before custom polling
      console.log('🔧 Initializing bot middleware before polling...');
      await this.bot.telegram.deleteWebhook(); // Ensure no webhook conflicts

      await this.startCustomPolling();

      console.log('🤖 Telegram Bot started in polling mode!');
      console.log('📞 Bot is now listening for messages...');
      console.log('🎯 Enhanced Telegram bot with natal chart management is LIVE!');

      // Test bot connectivity immediately after launch
      console.log('🔍 Testing bot connectivity...');
      const me = await this.bot.telegram.getMe();
      console.log('✅ Bot connected successfully:', me.username);

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
    process.once('SIGINT', () => this.bot.stop());
    process.once('SIGTERM', () => this.bot.stop());
  }

  private async startCustomPolling() {
    console.log('🔧 Starting custom polling implementation...');

    let offset = 0;
    const pollTimeout = 10; // 10 second timeout instead of default 30
    const limit = 10;

    const poll = async () => {
      try {
        console.log('🔍 Polling for updates...');
        const response = await axios.post(`https://api.telegram.org/bot${TOKEN}/getUpdates`, {
          offset: offset,
          limit: limit,
          timeout: pollTimeout,
          allowed_updates: ['message', 'callback_query']
        }, {
          timeout: (pollTimeout + 5) * 1000 // Add 5 seconds buffer for network timeout
        });

        const updates = response.data.result;

        if (updates.length > 0) {
          console.log(`📨 Received ${updates.length} updates`);
          for (const update of updates) {
            try {
              console.log('🔄 Processing update:', update.update_id);
              await this.bot.handleUpdate(update);
              console.log('✅ Update processed successfully');
              offset = update.update_id + 1;
            } catch (handleError: any) {
              console.error('❌ Error handling update:', handleError?.message);
              offset = update.update_id + 1; // Skip this update to avoid getting stuck
            }
          }
        }

      } catch (error: any) {
        console.error('❌ Polling error:', error.message);
        // Don't stop polling on errors, just log and continue
      }

      // Schedule next poll
      setTimeout(poll, 1000); // 1 second delay between polls
    };

    // Start initial poll
    poll();
    console.log('✅ Custom polling started successfully');
  }

  private async setupManualPolling() {
    console.log('🔧 Setting up manual polling as fallback...');

    try {
      console.log('🔄 Attempting custom polling restart...');
      await this.bot.telegram.deleteWebhook();
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Try custom polling method
      await this.startCustomPolling();

      console.log('✅ Manual restart successful!');

    } catch (manualErr: any) {
      console.error('❌ Manual restart also failed:', manualErr?.message);

      // Last resort: log the error and continue with other services
      console.log('⚠️ Bot will be unavailable, but other services will continue');
    }
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
