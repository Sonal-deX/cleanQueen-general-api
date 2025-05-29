import { Injectable, Inject, HttpException, HttpStatus, BadRequestException, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Op } from 'sequelize';
import { generatePassword } from '../utils/idGenerator';
import { EmailService } from '../email/email.service';
import { CreateSupervisorDto } from './dto/create-supervisor.dto';

export const USER_REPOSITORY = 'USER_REPOSITORY';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        @Inject(USER_REPOSITORY)
        private readonly userRepository: typeof User,
        private readonly emailService: EmailService,
    ) { }

    async create(createUserDto: CreateUserDto, creatorRole?: UserRole): Promise<User> {
        const existingUser = await this.userRepository.findOne({
            where: { [Op.or]: [{ email: createUserDto.email }, { username: createUserDto.username }] },
        });
        if (existingUser) {
            throw new BadRequestException('Email or username already exists.');
        }

        let roleToAssign = UserRole.CUSTOMER;
        if (creatorRole === UserRole.ADMIN && createUserDto.role) {
            roleToAssign = createUserDto.role;
        } else if (createUserDto.role && createUserDto.role !== UserRole.CUSTOMER) {
            throw new HttpException('Only Admins can assign roles.', HttpStatus.FORBIDDEN);
        }

        try {
            const user = await this.userRepository.create({ ...createUserDto, role: roleToAssign } as any);
            const { password, ...result } = user.toJSON();
            return result as User;
        } catch (error) {
            this.logger.error(`Failed to create user: ${error.message}`, error.stack);
            throw new InternalServerErrorException('User creation failed.');
        }
    }

    async createSupervisor(dto: CreateSupervisorDto): Promise<User> {
        const existingUser = await this.userRepository.findOne({
            where: { [Op.or]: [{ email: dto.email }, { username: dto.username }] },
        });
        if (existingUser) {
            throw new BadRequestException('Email or username already exists.');
        }

        const tempPassword = generatePassword();

        try {
            const supervisor = await this.userRepository.create({
                username: dto.username,
                email: dto.email,
                phoneNumber: dto.phoneNumber,
                password: tempPassword, // Will be hashed by hook
                role: UserRole.SUPERVISOR,
                isActive: true,
            } as any);

            // Send credentials via email (Don't await, let it run in background or use queues)
            this.emailService.sendSupervisorCredentials(dto.email, dto.username, tempPassword)
                .catch(err => this.logger.error(`Failed to send supervisor credentials to ${dto.email}`, err.stack));

            const { password, ...result } = supervisor.toJSON();
            return result as User;
        } catch (error) {
            this.logger.error(`Failed to create supervisor: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Supervisor creation failed.');
        }
    }


    async findAll(role?: UserRole): Promise<User[]> {
        const whereClause = role ? { role } : {};
        return this.userRepository.findAll({
            where: whereClause,
            attributes: { exclude: ['password'] }
        });
    }

    async findOneById(id: string, includePassword = false): Promise<User | null> {
        const options = includePassword ? {} : { attributes: { exclude: ['password'] } };
        return this.userRepository.findByPk(id, options);
    }

    async findOneByEmail(email: string, includePassword = false): Promise<User | null> {
        const options = includePassword ? {} : { attributes: { exclude: ['password'] } };
        return this.userRepository.findOne({ where: { email }, ...options });
    }

    async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
        const user = await this.findOneById(id, true); // Get user WITH password for potential update
        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (updateUserDto.email && updateUserDto.email !== user.email) {
            const exists = await this.userRepository.findOne({ where: { email: updateUserDto.email, id: { [Op.ne]: id } } });
            if (exists) throw new BadRequestException('Email already in use.');
        }
        if (updateUserDto.username && updateUserDto.username !== user.username) {
            const exists = await this.userRepository.findOne({ where: { username: updateUserDto.username, id: { [Op.ne]: id } } });
            if (exists) throw new BadRequestException('Username already taken.');
        }

        // Rename password DTO field if needed, or handle here
        if (updateUserDto.newPassword) {
            user.password = updateUserDto.newPassword;
            delete updateUserDto.newPassword; // Remove it so it doesn't get set directly
        }

        try {
            await user.update(updateUserDto);
            await user.save(); // Ensure hooks (like password hashing) run

            const updatedUser = await this.findOneById(id); // Get user WITHOUT password
            if (!updatedUser) {
                throw new NotFoundException('User not found after update');
            }
            return updatedUser;
        } catch (error) {
            this.logger.error(`Failed to update user ${id}: ${error.message}`, error.stack);
            throw new InternalServerErrorException('User update failed.');
        }
    }

    async remove(id: string): Promise<void> {
        const user = await this.userRepository.findByPk(id);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        try {
            await user.destroy();
        } catch (error) {
            this.logger.error(`Failed to delete user ${id}: ${error.message}`, error.stack);
            // Handle foreign key constraints - might be better to set projects/reviews to null
            throw new BadRequestException('Cannot delete user, they might have associated records.');
        }
    }
}
