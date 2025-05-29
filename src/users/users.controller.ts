import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';
import { GetUser } from '../common/decorators/user.decorator';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { CreateSupervisorDto } from './dto/create-supervisor.dto';

@Controller('users')
@UseGuards(JwtAuthGuard) // Apply JWT guard to the whole controller
export class UsersController {
    private readonly logger = new Logger(UsersController.name);

    constructor(private readonly usersService: UsersService) { }

    // POST /users - Create a new user (Admin only)
    @Post()
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.CREATED)
    create(@Body() createUserDto: CreateUserDto) {
        this.logger.log('Admin creating user...');
        return this.usersService.create(createUserDto);
    }

    // POST /users/supervisors - Admin creates a supervisor
    @Post('supervisors')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.CREATED)
    createSupervisor(@Body() createSupervisorDto: CreateSupervisorDto) {
        this.logger.log('Admin creating supervisor...');
        return this.usersService.createSupervisor(createSupervisorDto);
    }

    // GET /users - Get all users (Admin only)
    @Get()
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    findAll() {
        this.logger.log('Admin fetching all users...');
        return this.usersService.findAll();
    }

    // GET /users/:id - Get a specific user (Admin or self)
    @Get(':id')
    findOne(@Param('id') id: string, @GetUser() user: JwtPayload) {
        if (user.role === UserRole.ADMIN || user.userId === id) {
            this.logger.log(`Workspaceing user ${id}...`);
            return this.usersService.findOneById(id);
        } else {
            this.logger.warn(`Forbidden attempt to access user ${id} by ${user.userId}`);
            throw new ForbiddenException();
        }
    }

    // PATCH /users/:id - Update a user (Admin or self)
    @Patch(':id')
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @GetUser() user: JwtPayload) {
        if (user.role === UserRole.ADMIN || user.userId === id) {
            // Prevent non-admins from changing roles or status
            if (user.role !== UserRole.ADMIN) {
                delete updateUserDto.role;
                delete updateUserDto.isActive;
            }
            // Ensure non-admins cannot just set a password without currentPassword check (handle in AuthService/Profile)
            // If password change is handled here, add logic. Better in Auth.
            if (updateUserDto.newPassword && user.role !== UserRole.ADMIN) {
                throw new ForbiddenException('Password changes should go through the auth/profile endpoint.');
            }
            this.logger.log(`Updating user ${id}...`);
            return this.usersService.update(id, updateUserDto);
        } else {
            this.logger.warn(`Forbidden attempt to update user ${id} by ${user.userId}`);
            throw new ForbiddenException();
        }
    }

    // DELETE /users/:id - Delete a user (Admin only)
    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id: string, @GetUser() user: JwtPayload) {
        if (id === user.userId) {
            throw new ForbiddenException('Admin cannot delete their own account via this endpoint.');
        }
        this.logger.log(`Admin deleting user ${id}...`);
        return this.usersService.remove(id);
    }
}
