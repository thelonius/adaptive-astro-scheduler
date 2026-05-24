import { IEphemerisCalculator } from '../core/ephemeris';
import { UserRepository } from '../database/repositories/user.repository';
import { NatalChartRepository } from '../database/repositories/natal-chart.repository';
import { interpretationService } from './astrology/interpretation.service';
import type { DateTime } from '@adaptive-astro/shared/types';

const CHECK_LOCATION = { latitude: 55.75, longitude: 37.62 };
const CHECK_TIMEZONE = 'Europe/Moscow';
// Retry delay when ephemeris is unavailable
const RETRY_DELAY_MS = 5 * 60_000;

export class LunarDayScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null;
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
    this.scheduleNext();
  }

  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async scheduleNext() {
    try {
      const dateTime: DateTime = { date: new Date(), timezone: CHECK_TIMEZONE, location: CHECK_LOCATION };
      const lunarDay = await this.ephemeris.getLunarDay(dateTime);

      const endsAt = lunarDay.endsAt;
      if (!endsAt) {
        // API didn't return endsAt — retry in 5 minutes
        console.warn('🌙 LunarDayScheduler: endsAt missing, retrying in 5 min');
        this.timer = setTimeout(() => this.scheduleNext(), RETRY_DELAY_MS);
        return;
      }

      const msUntilEnd = endsAt.getTime() - Date.now();
      // Fire 2 seconds after the day ends to be sure the new day is active
      const delay = Math.max(msUntilEnd + 2_000, 1_000);

      console.log(`🌙 LunarDayScheduler: day ${lunarDay.number} ends at ${endsAt.toISOString()}, firing in ${Math.round(delay / 60_000)} min`);

      this.timer = setTimeout(async () => {
        await this.onDayChange();
        this.scheduleNext();
      }, delay);
    } catch (err) {
      console.error('🌙 LunarDayScheduler: scheduleNext failed, retrying in 5 min', err);
      this.timer = setTimeout(() => this.scheduleNext(), RETRY_DELAY_MS);
    }
  }

  private async onDayChange() {
    try {
      const dateTime: DateTime = { date: new Date(), timezone: CHECK_TIMEZONE, location: CHECK_LOCATION };
      const lunarDay = await this.ephemeris.getLunarDay(dateTime);
      console.log(`🌙 Lunar day changed → ${lunarDay.number}`);
      await this.broadcast(lunarDay.number, lunarDay.lunarPhase);
    } catch (err) {
      console.error('🌙 LunarDayScheduler: onDayChange failed', err);
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
        .map(u => this.sendWithChartButton(u, text))
    );

    const failed = results.filter(r => r.status === 'rejected').length;
    console.log(`🌙 Broadcast sent to ${results.length - failed}/${results.length} subscribers`);
  }

  private async sendWithChartButton(user: any, text: string) {
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
      New: 'новолуние', Waxing: 'растущая', Full: 'полнолуние', Waning: 'убывающая',
    };
    const phaseRu = phaseMap[phase] || phase;

    let text = `🌙 *Наступил ${dayNum}-й лунный день*\n`;
    if (raw?.symbol) text += `Символ: *${raw.symbol}* · ${phaseRu}\n\n`;
    if (raw?.general) text += `${raw.general}\n\n`;
    if (raw?.warning) text += `⚠️ ${raw.warning}\n\n`;
    if (raw?.is_dark) text += `_Тёмный лунный день — соблюдай осторожность._\n\n`;

    const rec = raw?.recommended;
    if (rec?.length) text += `✅ *Хорошо:* ${rec.slice(0, 3).join(', ')}\n`;
    const noRec = raw?.not_recommended;
    if (noRec?.length) text += `🚫 *Избегать:* ${noRec.slice(0, 2).join(', ')}\n`;

    return text;
  }
}
