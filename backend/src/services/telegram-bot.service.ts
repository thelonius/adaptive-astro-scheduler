import { Telegraf, Context, Markup, session } from 'telegraf';
import LocalSession from 'telegraf-session-local';
import { UserRepository } from '../database/repositories/user.repository';
import { NatalChartRepository } from '../database/repositories/natal-chart.repository';
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
  awaiting?: 'BIRTH_DATE' | 'BIRTH_TIME' | null;
  temp?: {
    lat?: number;
    lon?: number;
    birthDate?: string;
  };
}

interface BotContext extends Context {
  session: SessionData;
}

export class TelegramBotService {
  private bot: Telegraf<BotContext>;
  private userRepo: UserRepository;
  private natalRepo: NatalChartRepository;
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
      console.log('🔧 Repositories initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize repositories:', error);
      this.userRepo = new UserRepository();
      this.natalRepo = new NatalChartRepository();
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
    // /start
    this.bot.start(async (ctx) => {
      console.log('🎯 /start command received from user:', ctx.from.id);
      try {
        const telegramId = ctx.from.id;

        // Try to create/find user, but don't fail if DB is down
        try {
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
        } catch (dbError) {
          console.log('💾 Database not available, proceeding without user storage');
        }

        await ctx.reply(
          `Welcome ${ctx.from.first_name}! 🌟\n` +
          "I am your Adaptive Astro Scheduler. To give you accurate personalized insights, I need your birth chart data.\n\n" +
          "Let's start with your birth location.",
          Markup.keyboard([
            Markup.button.locationRequest('📍 Share Location')
          ]).resize().oneTime()
        );
        console.log('✅ /start response sent successfully');
      } catch (error) {
        console.error('❌ Error in /start command:', error);
        await ctx.reply('Hello! I\'m your Astro Scheduler bot. Something went wrong, but you can try again!');
      }
    });

    // Handle Location
    this.bot.on('location', async (ctx) => {
      const { latitude, longitude } = ctx.message.location;
      ctx.session.temp = { lat: latitude, lon: longitude };
      ctx.session.awaiting = 'BIRTH_DATE';

      // Resolve Timezone immediately to verify location service
      try {
        const tzResponse = await axios.post(`${EPHEMERIS_API_URL}/api/v1/geo/timezone`, {
            latitude, longitude
        });
        const timezone = tzResponse.data.timezone;

        await ctx.reply(
            `Got it! Location received (${latitude}, ${longitude}).\n` +
            `Timezone detected: ${timezone}\n\n` +
            `Now, please enter your birth date (YYYY-MM-DD):`,
            Markup.removeKeyboard()
        );
      } catch (error) {
          console.error('Timezone Error:', error);
          await ctx.reply("I couldn't detect the timezone for that location. Please try sharing the location again.");
      }
    });

    // Handle Text (for dates/times)
    this.bot.on('text', async (ctx) => {
      if (!ctx.session.awaiting) return;

      const text = ctx.message.text.trim();

      if (ctx.session.awaiting === 'BIRTH_DATE') {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(text)) {
            return ctx.reply('Please use the format YYYY-MM-DD (e.g. 1990-05-25)');
        }

        ctx.session.temp!.birthDate = text;
        ctx.session.awaiting = 'BIRTH_TIME';
        return ctx.reply('Great! Now enter your birth time (HH:MM) - use 24h format (e.g. 14:30):');
      }

      if (ctx.session.awaiting === 'BIRTH_TIME') {
          const timeRegex = /^\d{2}:\d{2}$/;
          if (!timeRegex.test(text)) {
              return ctx.reply('Please use the format HH:MM (e.g. 14:30)');
          }

          const birthTime = text + ':00';
          const { lat, lon, birthDate } = ctx.session.temp!;
          const telegramId = ctx.from.id;

          await ctx.reply('Calculating your natal chart... ✨');
          ctx.session.awaiting = null;

          try {
              // 1. Get User
              const user = await this.userRepo.findByTelegramId(telegramId);
              if (!user) throw new Error('User not found');

              // 2. Resolve Timezone again (or could store it in session)
              const tzResponse = await axios.post(`${EPHEMERIS_API_URL}/api/v1/geo/timezone`, {
                latitude: lat, longitude: lon
              });
              const timezone = tzResponse.data.timezone;

              // 3. Create Natal Chart (Logic to call python API or internal repo)
              // For now we just reply success. Real implementation needs to call ephemeris to calculate positions first.

              await ctx.reply(`Chart created for ${birthDate} ${birthTime} in ${timezone}!\n(Full calculation integration pending)`);

              // TODO: Integrate NatalChartController logic here to actually calculate and save.

          } catch (error) {
              console.error(error);
              ctx.reply('Something went wrong calculating your chart. Please try /start again.');
          }
      }
    });

    // /today command
    this.bot.command('today', async (ctx) => {
      console.log('🎯 /today command received from user:', ctx.from.id);
      try {
        const today = new Date().toISOString().split('T')[0];
        await ctx.reply(
          `📅 Today's Astrological Energy (${today}) 🌟\n\n` +
          "🌙 Moon Phase: Waxing Crescent\n" +
          "⭐ Key Aspects: Venus trine Jupiter\n" +
          "🔮 Energy: Focus on creativity and relationships\n\n" +
          "(Full real-time calculations coming soon!)"
        );
        console.log('✅ /today response sent successfully');
      } catch (error) {
        console.error('❌ Error in /today command:', error);
        await ctx.reply('Today\'s energy: 🌙 ... (Coming soon)');
      }
    });

    // Add help command
    this.bot.command('help', async (ctx) => {
      try {
        await ctx.reply(
          "🤖 *Astro Scheduler Commands:*\n\n" +
          "/start - Begin setup or restart bot\n" +
          "/today - Get today's astrological energy\n" +
          "/help - Show this help message\n\n" +
          "Send me your location to create a personalized natal chart!",
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.error('Error in /help command:', error);
        await ctx.reply('Available commands: /start, /today, /help');
      }
    });
  }

  public async launch() {
    if (!TOKEN) {
      console.log('❌ No bot token provided, skipping bot launch');
      return;
    }

    console.log('🚀 Launching Telegram Bot...');

    if (IS_PRODUCTION && WEBHOOK_URL) {
      // Production: Use webhook mode
      console.log('📡 Using webhook mode');
      await this.setupWebhook();
    } else {
      // Development: Use polling mode
      console.log('🔄 Using polling mode');

      try {
        await this.bot.launch();
        console.log('🤖 Telegram Bot started in polling mode!');
        console.log('📞 Bot is now listening for messages...');
      } catch (err) {
        console.error('❌ Failed to launch Telegram Bot:', err);
        console.error('Bot token valid:', TOKEN ? 'Yes' : 'No');
      }
    }

    // Enable graceful stop
    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
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

  public static setInstance(instance: TelegramBotService) {
    this.instance = instance;
  }
}
