import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { CreateUserDto, UpdateUserDto } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let prismaService: PrismaService;
  let loggerService: LoggerService;

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockLoggerService = {
    setContext: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prismaService = module.get<PrismaService>(PrismaService);
    loggerService = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    const createUserDto: CreateUserDto = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'SecurePass123!',
      role: 'user',
    };

    it('should create a user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashed-password',
        role: 'user',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.createUser(createUserDto);

      expect(result).toEqual({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        isActive: true,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { username: 'testuser' },
            { email: 'test@example.com' },
          ],
        },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if user already exists', async () => {
      const existingUser = {
        id: 'existing-user',
        username: 'testuser',
        email: 'test@example.com',
      };

      mockPrismaService.user.findFirst.mockResolvedValue(existingUser);

      await expect(service.createUser(createUserDto)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for weak password', async () => {
      const weakPasswordDto = {
        ...createUserDto,
        password: 'weak',
      };

      await expect(service.createUser(weakPasswordDto)).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.create.mockRejectedValue(new Error('Database error'));

      await expect(service.createUser(createUserDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('authenticate', () => {
    const loginCredentials = {
      username: 'testuser',
      password: 'SecurePass123!',
    };

    const mockUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashed-password',
      role: 'user',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should authenticate user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.authenticate(loginCredentials);

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.user).toEqual({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        isActive: true,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it('should return failure for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.authenticate(loginCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should return failure for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockPrismaService.user.findUnique.mockResolvedValue(inactiveUser);

      const result = await service.authenticate(loginCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Account is deactivated');
    });

    it('should return failure for invalid password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.authenticate({
        ...loginCredentials,
        password: 'wrongpassword',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should handle authentication errors', async () => {
      mockPrismaService.user.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await service.authenticate(loginCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed');
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserById('user-123');

      expect(result).toEqual({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        isActive: true,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUser', () => {
    const updateUserDto: UpdateUserDto = {
      username: 'updateduser',
      email: 'updated@example.com',
    };

    it('should update user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'updateduser',
        email: 'updated@example.com',
        role: 'user',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.updateUser('user-123', updateUserDto);

      expect(result).toEqual({
        id: 'user-123',
        username: 'updateduser',
        email: 'updated@example.com',
        role: 'user',
        isActive: true,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          username: 'updateduser',
          email: 'updated@example.com',
        },
      });
    });

    it('should handle update errors', async () => {
      mockPrismaService.user.update.mockRejectedValue(new Error('Database error'));

      await expect(service.updateUser('user-123', updateUserDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      mockPrismaService.user.delete.mockResolvedValue({});

      await service.deleteUser('user-123');

      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });

    it('should handle delete errors', async () => {
      mockPrismaService.user.delete.mockRejectedValue(new Error('Database error'));

      await expect(service.deleteUser('user-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('listUsers', () => {
    it('should return paginated list of users', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'user1',
          email: 'user1@example.com',
          role: 'user',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'user-2',
          username: 'user2',
          email: 'user2@example.com',
          role: 'admin',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(2);

      const result = await service.listUsers(0, 10);

      expect(result).toEqual({
        users: mockUsers,
        total: 2,
      });
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
