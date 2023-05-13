import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { JwtService } from "src/jwt/jwt.service";
import { MailService } from "src/mail/mail.service";
import { Repository } from "typeorm";
import { User, UserRole } from "./entities/user.entity";
import { Verification } from "./entities/verification.entity";
import { UsersService } from "./users.service";
import { CreateAccountInput } from "./dtos/create-account.dto";

const mockRepository = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  findOneOrFail: jest.fn(),
  delete: jest.fn(),
});

const mockJwtService = () => ({
  sign: jest.fn(() => "sigend-token-baby"),
  verify: jest.fn(),
});

const mockMailService = () => ({
  sendVerificationEmail: jest.fn(),
});

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe("UserService", () => {
  let service: UsersService;
  let usersRepository: MockRepository<User>;
  let verificationsRepository: MockRepository<Verification>;
  let emailService: MailService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Verification),
          useValue: mockRepository(),
        },
        ConfigService,
        {
          provide: JwtService,
          useValue: mockJwtService(),
        },
        {
          provide: MailService,
          useValue: mockMailService(),
        },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
    emailService = module.get<MailService>(MailService);
    jwtService = module.get<JwtService>(JwtService);
    usersRepository = module.get(getRepositoryToken(User));
    verificationsRepository = module.get(getRepositoryToken(Verification));
  });
  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createAccount", () => {
    const createAccountAgs: CreateAccountInput = {
      email: "",
      password: "",
      role: UserRole.Client,
    };
    it("should fail if user exists", async () => {
      usersRepository.findOne.mockResolvedValue({
        id: 1,
        email: "asdfadf",
      });
      const result = await service.createAccount(createAccountAgs);
      expect(result).toMatchObject({
        ok: false,
        error: "There is a user with that email already",
      });
    });

    it("should create a new user", async () => {
      usersRepository.findOne.mockReturnValue(undefined);
      usersRepository.create.mockReturnValue(createAccountAgs);
      usersRepository.save.mockResolvedValue(createAccountAgs);
      verificationsRepository.create.mockReturnValue({
        user: createAccountAgs,
      });
      verificationsRepository.save.mockResolvedValue({
        code: "code",
      });
      const result = await service.createAccount(createAccountAgs);
      expect(usersRepository.create).toHaveBeenCalledTimes(1);
      expect(usersRepository.create).toHaveBeenCalledWith(createAccountAgs);
      expect(usersRepository.save).toHaveBeenCalledTimes(1);
      expect(usersRepository.save).toHaveBeenCalledWith(createAccountAgs);
      expect(verificationsRepository.create).toHaveBeenCalledTimes(1);
      expect(verificationsRepository.create).toHaveBeenCalledWith({
        user: createAccountAgs,
      });
      expect(verificationsRepository.save).toHaveBeenCalledTimes(1);
      expect(verificationsRepository.save).toHaveBeenCalledWith({
        user: createAccountAgs,
      });
      expect(emailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String)
      );
      expect(result).toEqual({ ok: true });
    });

    it("should fail on exception", async () => {
      usersRepository.findOne.mockRejectedValue(new Error());
      const result = await service.createAccount(createAccountAgs);
      expect(result).toEqual({
        ok: false,
        error: "Couldn't creat account",
      });
    });
  });
  describe("login", () => {
    const loginArgs = {
      email: "bs@eamil.com",
      password: "bs.password",
    };
    it("should fail if user does not exist", async () => {
      usersRepository.findOne.mockResolvedValue(null);
      const result = await service.login(loginArgs);
      expect(usersRepository.findOne).toHaveBeenCalledTimes(1);
      expect(usersRepository.findOne).toHaveBeenCalledWith(expect.any(Object));
      expect(result).toEqual({
        ok: false,
        error: "User not Found",
      });
    });

    it("should fail if the password is wrong", async () => {
      const mockedUser = {
        id: 1,
        checkPassword: jest.fn(() => Promise.resolve(false)),
      };
      usersRepository.findOne.mockResolvedValue(mockedUser);
      const result = await service.login(loginArgs);
      expect(result).toEqual({ ok: false, error: "Wrong Password" });
    });

    it("should return token if password correct", async () => {
      const mockedUser = {
        id: 1,
        checkPassword: jest.fn(() => Promise.resolve(true)),
      };
      usersRepository.findOne.mockResolvedValue(mockedUser);
      const result = await service.login(loginArgs);
      expect(jwtService.sign).toHaveBeenCalledTimes(1);
      expect(jwtService.sign).toHaveBeenCalledWith(expect.any(Number));
      expect(result).toEqual({ ok: true, token: "sigend-token-baby" });
    });
  });
  describe("findById", () => {
    const findByIdArgs = {
      id: 1,
    };

    it("should find an existing user", async () => {
      usersRepository.findOneOrFail.mockResolvedValue(findByIdArgs);
      const result = await service.findById(1);
      expect(result).toEqual({ ok: true, user: findByIdArgs });
    });

    it("should fail if no user if found", async () => {
      usersRepository.findOneOrFail.mockRejectedValue(new Error());
      const result = await service.findById(1);
      expect(result).toEqual({
        ok: false,
        error: "User Not Found",
      });
    });
  });
  describe("editProfile", () => {
    it("should change email", async () => {
      const oldUser = {
        email: "bs@old.com",
        verified: true,
      };

      const editProfileArgs = {
        userId: 1,
        input: { email: "bs@new.com" },
      };

      const newVerification = {
        code: "code",
      };

      const newUser = {
        verified: false,
        email: editProfileArgs.input.email,
      };

      usersRepository.findOne.mockResolvedValue(oldUser);
      verificationsRepository.create.mockReturnValue(newVerification);
      verificationsRepository.save.mockResolvedValue(newVerification);

      await service.editProfile(editProfileArgs.userId, editProfileArgs.input);

      expect(usersRepository.findOne).toHaveBeenCalledTimes(1);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: editProfileArgs.userId,
        },
      });

      expect(verificationsRepository.create).toHaveBeenCalledWith({
        user: newUser,
      });
      expect(verificationsRepository.save).toHaveBeenCalledWith(
        newVerification
      );
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        newUser.email,
        newVerification.code
      );
    });

    it("should change password", async () => {
      const editProfileArgs = {
        userId: 1,
        input: { password: "new.password" },
      };
      usersRepository.findOne.mockResolvedValue({ password: "old" });
      const result = await service.editProfile(
        editProfileArgs.userId,
        editProfileArgs.input
      );
      expect(usersRepository.save).toHaveBeenCalledTimes(1);
      expect(usersRepository.save).toHaveBeenCalledWith({
        password: "new.password",
      });
      expect(result).toEqual({ ok: true });
    });

    it("should fail on exception", async () => {
      usersRepository.findOne.mockRejectedValue(new Error());
      const result = await service.editProfile(1, { email: "12" });
      expect(result).toEqual({
        ok: false,
        error: "Could not update profile.",
      });
    });
  });
  describe("verifyEmail", () => {
    it("should verify email", async () => {
      const mockedVerification = {
        user: {
          verified: false,
        },
        id: 1,
      };
      verificationsRepository.findOne.mockResolvedValue(mockedVerification);

      const result = await service.verifyEmail("code");
      expect(verificationsRepository.findOne).toHaveBeenCalledTimes(1);
      expect(verificationsRepository.findOne).toHaveBeenCalledWith(
        expect.any(Object)
      );
      expect(usersRepository.save).toHaveBeenCalledTimes(1);
      expect(usersRepository.save).toHaveBeenCalledWith({
        verified: true,
      });
      expect(verificationsRepository.delete).toHaveBeenCalledTimes(1);
      expect(verificationsRepository.delete).toHaveBeenCalledWith(
        mockedVerification.id
      );
      expect(result).toEqual({ ok: true });
    });

    it("should fail on verification not found", async () => {
      verificationsRepository.findOne.mockResolvedValue(undefined);
      const result = await service.verifyEmail("");
      expect(result).toEqual({
        ok: false,
        error: "Verification not found.",
      });
    });

    it("should fail on exception", async () => {
      verificationsRepository.findOne.mockRejectedValue(new Error());
      const result = await service.verifyEmail("");
      expect(result).toEqual({
        ok: false,
        error: "Could not verify email.",
      });
    });
  });
});
