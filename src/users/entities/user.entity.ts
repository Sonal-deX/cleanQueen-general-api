import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    IsEmail,
    Unique,
    AllowNull,
    Default,
    BeforeCreate,
    BeforeUpdate,
    HasMany,
    BelongsToMany,
} from 'sequelize-typescript';
import * as bcrypt from 'bcryptjs';
import { generateUserAndProjectAndReviewId } from '../../utils/idGenerator';
// import { CleaningRequest } from '../../requests/entities/request.entity';
// import { Project } from '../../projects/entities/project.entity';
// import { Review } from '../../reviews/entities/review.entity';
// import { ProjectSupervisor } from '../../projects/entities/project-supervisor.entity';

export enum UserRole {
    CUSTOMER = 'customer',
    SUPERVISOR = 'supervisor',
    ADMIN = 'admin',
}

@Table({
    tableName: 'users',
    timestamps: true,
    underscored: true,
})
export class User extends Model<User> {
    @PrimaryKey
    @Default(() => generateUserAndProjectAndReviewId())
    @Column({ type: DataType.STRING(6), allowNull: false, unique: true })
    declare id: string;

    @Unique
    @AllowNull(false)
    @Column(DataType.STRING)
    username: string;

    @IsEmail
    @Unique
    @AllowNull(false)
    @Column(DataType.STRING)
    email: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    password!: string;

    @Column(DataType.STRING)
    phoneNumber: string;

    @AllowNull(false)
    @Default(UserRole.CUSTOMER)
    @Column(DataType.ENUM(...Object.values(UserRole)))
    role: UserRole;

    @Default(true)
    @Column(DataType.BOOLEAN)
    isActive: boolean;

    @BeforeCreate
    @BeforeUpdate
    static async hashPassword(instance: User) {
        if ((instance.changed('password') || instance.isNewRecord) && instance.password) {
            const salt = await bcrypt.genSalt(10);
            instance.password = await bcrypt.hash(instance.password, salt);
        }
    }

    async isValidPassword(password: string): Promise<boolean> {
        return bcrypt.compare(password, this.password);
    }

    //   @HasMany(() => CleaningRequest)
    //   cleaningRequests: CleaningRequest[];

    //   @HasMany(() => Project, 'customerId')
    //   projectsAsCustomer: Project[];

    //   @HasMany(() => Review, 'supervisorId')
    //   reviewsWritten: Review[];

    //   @BelongsToMany(() => Project, () => ProjectSupervisor, 'supervisorId', 'projectId')
    //   projectsAsSupervisor: Project[];
}