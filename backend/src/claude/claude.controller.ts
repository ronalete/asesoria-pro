// Controlador para endpoints directos de Claude API
import { Controller, Post, Body } from '@nestjs/common';
import { ClaudeService } from './claude.service';

@Controller('claude')
export class ClaudeController {
  constructor(private readonly claudeService: ClaudeService) {}

  @Post('chat')
  async chat(@Body() body: { messages: { role: string; content: string }[] }) {
    const respuesta = await this.claudeService.chat(body.messages || []);
    return { success: true, data: { content: [{ text: respuesta }] } };
  }
}
