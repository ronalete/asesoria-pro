import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { WhatsappBotService } from './whatsapp-bot.service';
import { ClaudeModule } from '../claude/claude.module';

@Module({
  imports: [ClaudeModule],
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappBotService],
  exports: [WhatsappBotService],
})
export class WhatsappModule {}
