import { Module } from '@nestjs/common';
import { CompanyModule } from './company.module';
import { InvitationsModule } from './invitations.module';

@Module({
  imports: [CompanyModule, InvitationsModule],
  exports: [CompanyModule, InvitationsModule],
})
export class OrganizationsModule {}
