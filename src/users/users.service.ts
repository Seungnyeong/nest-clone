import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    CreateAccountInput,
    CreateAccountOutput
} from './dtos/create-account.dto';
import { LoginInput, LoginOutput } from './dtos/login.dto';
import { User } from './entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { JwtService } from 'src/jwt/jwt.service';
import { EditProfileInput, EditProfileOutput } from './dtos/edit-profile.dto';
import { Verification } from './entities/verification.entity';
import { UserProfileOutput } from './dtos/user-profile.dto';
import { VerifyEmailOutput } from './dtos/verify-email.dto';
import { MailService } from 'src/mail/mail.service';
@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User) private readonly users: Repository<User>,
        @InjectRepository(Verification)
        private readonly verifications: Repository<Verification>,
        private readonly config: ConfigService,
        private readonly jwtService: JwtService,
        private readonly mailService: MailService
    ) {}

    async createAccount({
        email,
        password,
        role
    }: CreateAccountInput): Promise<CreateAccountOutput> {
        try {
            const exists = await this.users.findOne({ where: { email } });
            if (exists) {
                return {
                    ok: false,
                    error: 'There is a user with that email already'
                };
            }
            const user = await this.users.save(
                this.users.create({ email, password, role })
            );
            const verifications = await this.verifications.save(
                this.verifications.create({
                    user
                })
            );
            this.mailService.sendVerificationEmail(
                user.email,
                verifications.code
            );
            return {
                ok: true
            };
        } catch (e) {
            return { ok: false, error: "Couldn't creat account" };
        }
    }

    async login({ email, password }: LoginInput): Promise<LoginOutput> {
        // find the user with the email
        // check if the passwor dis corret
        // make a JWT give it to the user
        try {
            const user = await this.users.findOne({
                where: { email },
                select: ['password', 'id']
            });
            if (!user) {
                return {
                    ok: false,
                    error: 'User not Found'
                };
            }

            const passwordCorrect = await user.checkPassword(password);
            if (!passwordCorrect) {
                return {
                    ok: false,
                    error: 'Wrong Password'
                };
            }
            const token = this.jwtService.sign(user.id);
            return {
                ok: true,
                token
            };
        } catch (error) {
            return {
                ok: false,
                error
            };
        }
    }

    async findById(id: number): Promise<UserProfileOutput> {
        try {
            const user = await this.users.findOneOrFail({ where: { id } });
            return {
                ok: true,
                user: user
            };
        } catch (error) {
            return {
                ok: false,
                error: 'User Not Found'
            };
        }
    }

    async editProfile(
        userId: number,
        { email, password }: EditProfileInput
    ): Promise<EditProfileOutput> {
        try {
            const user = await this.users.findOne({
                where: {
                    id: userId
                }
            });
            if (email) {
                user.email = email;
                user.verified = false;
                const verifications = await this.verifications.save(
                    this.verifications.create({ user })
                );
                this.mailService.sendVerificationEmail(
                    user.email,
                    verifications.code
                );
            }
            if (password) {
                user.password = password;
            }
            await this.users.save(user);
            return {
                ok: true
            };
        } catch (erorr) {
            return {
                ok: false,
                error: 'Could not update profile.'
            };
        }
    }

    async verifyEmail(code: string): Promise<VerifyEmailOutput> {
        try {
            const verification = await this.verifications.findOne({
                where: {
                    code
                },
                relations: ['user']
            });

            if (verification) {
                verification.user.verified = true;
                await this.users.save(verification.user);
                await this.verifications.delete(verification.id);
                return {
                    ok: true
                };
            }
            return { ok: false, error: 'Verification not found.' };
        } catch (error) {
            return {
                ok: false,
                error: 'Could not verify email.'
            };
        }
    }
}
