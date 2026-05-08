import { IEphemerisCalculator } from '../core/ephemeris';
import { UserRepository } from '../database/repositories/user.repository';
import { NatalChartRepository } from '../database/repositories/natal-chart.repository';
import { interpretationService } from './astrology/interpretation.service';
import type { DateTime } from '@adaptive-astro/shared/types';

// Fixed location for lunar day calculation (Moscow, UTC+3)
const CHECK_LOCATION = { latitude: 55.75, longitude: 37.62 };
const CHECK_TIMEZONE = 'Europe/Moscow';
const POLL_INTERVAL_MS = 60_000; // 1 minute

export class LunarDayScheduler {
  private lastLunarDay: number | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private sendMessage: (chatId: number, text: string, extra?: Record<string, unknown>) => Promise<void>;

  constructor(
    private ephemeris: IEphemerisCalculator,
    private userRepo: UserRepository,
    private natalRepo: NatalChartRepository,
    sendMessage: (chatId: number, text: string, extra?: Record<string, unknown>) => Promise<void>
  ) {
    this.sendMessage = sendMessage;
  }

  start() {
    if (this.timer) return;
    console.log('🌙 LunarDayScheduler started');
    this.timer = setInterval(() => this.check(), POLL_INTERVAL_MS);
    // Run immediately on start to seed lastLunarDay without broadcasting
    this.seedCurrentDay();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async seedCurrentDay() {
    try {
      const dateTime: DateTime = { date: new Date(), timezone: CHECK_TIMEZONE, location: CHECK_LOCATION };
      const lunarDay = await this.ephemeris.getLunarDay(dateTime);
      this.lastLunarDay = lunarDay.number;
    } catch (err) {
      console.error('LunarDayScheduler: failed to seed current day', err);
    }
  }

  private async check() {
    try {
      const now = new Date();
      const dateTime: DateTime = { date: now, timezone: CHECK_TIMEZONE, location: CHECK_LOCATION };
      const lunarDay = await this.ephemeris.getLunarDay(dateTime);

      if (this.lastLunarDay !== null && lunarDay.number !== this.lastLunarDay) {
        console.log(`🌙 Lunar day changed: ${this.lastLunarDay} → ${lunarDay.number}`);
        await this.broadcast(lunarDay.number, lunarDay.lunarPhase);
      }

      this.lastLunarDay = lunarDay.number;
    } catch (err) {
      console.error('LunarDayScheduler: check failed', err);
    }
  }

  private async broadcast(dayNum: number, phase: string) {
    const subscribers = await this.userRepo.findAllWithNotifications();
    if (subscribers.length === 0) return;

    const raw = interpretationService.getLunarDayRaw(dayNum);
    const text = this.formatBroadcast(dayNum, phase, raw);

    const results = await Promise.allSettled(
      subscribers
        .filter(u => u.telegram_id != null)
        .map(u => this.sendWithChartButton(u, text, dayNum))
    );

    const failed = results.filter(r => r.status === 'rejected').length;
    console.log(`🌙 Broadcast sent to ${results.length - failed}/${results.length} subscribers`);
  }

  private async sendWithChartButton(user: any, text: string, _dayNum: number) {
    const charts = await this.natalRepo.findByUserId(user.id);
    const chartId = charts[0]?.id;

    const extra: Record<string, unknown> = { parse_mode: 'Markdown' };
    if (chartId) {
      extra.reply_markup = {
        inline_keyboard: [[
          { text: '🔮 Мой расклад', callback_data: `today_${chartId}` },
          { text: '📅 7 дней', callback_data: `cal_0_${chartId}` },
        ]],
      };
    }

    await this.sendMessage(user.telegram_id, text, extra);
  }

  private formatBroadcast(dayNum: number, phase: string, raw: any): string {
    const phaseMap: Record<string, string> = {
      'New': 'новолуние',
      'Waxing': 'растущая',
      'Full': 'полнолуние',
      'Waning': 'убывающая',
    };
    const phaseRu = phaseMap[phase] || phase;

    let text = `🌙 *Наступил ${dayNum}-й лунный день*\n`;
    if (raw?.symbol) text += `Символ: *${raw.symbol}* · ${phaseRu}\n\n`;

    if (raw?.general) text += `${raw.general}\n\n`;

    if (raw?.warning) text += `⚠️ ${raw.warning}\n\n`;

    if (raw?.is_dark) {
      text += `_Тёмный лунный день — соблюдай осторожность._\n\n`;
    }

    const recommended = raw?.recommended;
    if (recommended?.length) {
      text += `✅ *Хорошо:* ${recommended.slice(0, 3).join(', ')}\n`;
    }
    const notRecommended = raw?.not_recommended;
    if (notRecommended?.length) {
      text += `🚫 *Избегать:* ${notRecommended.slice(0, 2).join(', ')}\n`;
    }

    return text;
  }
}
