import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { Provider } from '@prisma/client';
import { AuthService as AuthChecker } from '@gitroom/helpers/auth/auth.service';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

/**
 * Bootstraps a single super-admin account from the environment — no DB edits.
 *   SUPER_ADMIN_EMAIL     the login email
 *   SUPER_ADMIN_PASSWORD  the login password (hashed on write; kept authoritative)
 *   SUPER_ADMIN_ENABLED   'false' disables the account (revokes super-admin)
 * Runs on every boot: creates the account if missing, keeps its password/flags in
 * sync when present, and revokes super-admin when disabled. The account bypasses
 * the paywall and deploys any automation for free.
 */
@Injectable()
export class SuperAdminBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(SuperAdminBootstrap.name);

  constructor(
    private readonly _users: UsersService,
    private readonly _orgs: OrganizationService,
    private readonly _user: PrismaRepository<'user'>
  ) {}

  async onApplicationBootstrap() {
    const email = (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.SUPER_ADMIN_PASSWORD || '';
    const enabled = process.env.SUPER_ADMIN_ENABLED !== 'false';
    if (!email) return;

    try {
      const existing = await this._users.getUserByEmail(email);

      if (!enabled) {
        if (existing?.isSuperAdmin) {
          await this._user.model.user.update({
            where: { id: existing.id },
            data: { isSuperAdmin: false },
          });
          this.logger.log(`super-admin disabled: ${email}`);
        }
        return;
      }

      if (!existing) {
        if (!password) {
          this.logger.warn(
            'SUPER_ADMIN_EMAIL set but SUPER_ADMIN_PASSWORD missing — cannot create the account'
          );
          return;
        }
        const created: any = await this._orgs.createOrgAndUser(
          {
            email,
            password,
            company: 'DuabaConnect Admin',
            provider: Provider.LOCAL,
          } as any,
          '0.0.0.0',
          'super-admin-bootstrap'
        );
        const userId = created?.users?.[0]?.user?.id;
        if (userId) {
          await this._user.model.user.update({
            where: { id: userId },
            data: { isSuperAdmin: true, activated: true },
          });
        }
        this.logger.log(`super-admin created: ${email}`);
        return;
      }

      // Exists — ensure it's an activated super-admin; keep the env password
      // authoritative so a rotated SUPER_ADMIN_PASSWORD takes effect on deploy.
      const data: any = { isSuperAdmin: true, activated: true };
      if (password) data.password = AuthChecker.hashPassword(password);
      await this._user.model.user.update({
        where: { id: existing.id },
        data,
      });
      this.logger.log(`super-admin ensured: ${email}`);
    } catch (e: any) {
      this.logger.error(`super-admin bootstrap failed: ${e?.message}`);
    }
  }
}
