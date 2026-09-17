import { Controller, Get } from '@nestjs/common';

/** Unauthenticated liveness endpoint used by scaffolding tests and probes. */
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }
}
