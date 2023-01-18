import got from 'got';
import * as FormData from 'form-data';
import { Inject, Injectable } from '@nestjs/common';
import { CONFIG_OPTIONS } from '../common/common.constants';
import { EmailVars, MailModuleOptions } from './mail.interfaces';

@Injectable()
export class MailService {
  constructor(
    @Inject(CONFIG_OPTIONS) private readonly options: MailModuleOptions,
  ) {
    // this.sendEmail('test', 'th');
  }
  private async sendEmail(
    subject: string,
    template: string,
    emailVar: EmailVars[],
  ) {
    const form = new FormData();
    form.append(
      'from',
      `SN From NumberEats <mailgun@${this.options.emailDomain}>`,
    );
    form.append('to', 'workingsnkim@gmail.com');
    form.append('subject', subject);
    form.append('template', template);
    emailVar.forEach((eVar) => form.append(`v:${eVar.key}`, eVar.value));

    try {
      const response = await got(
        `https://api.mailgun.net/v3/${this.options.emailDomain}/messages`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(
              `api:${this.options.apiKey}`,
            ).toString('base64')}`,
          },
          method: 'POST',
          body: form,
        },
      );
    } catch (error) {
      console.error(error);
    }
  }

  sendVerificationEmail(email: string, code: string) {
    this.sendEmail('Verify Your Email', 'numbe', [
      { key: 'code', value: code },
      { key: 'username', value: email },
    ]);
  }
}
