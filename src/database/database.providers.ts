import { Sequelize } from 'sequelize-typescript';
import { ConfigService } from '@nestjs/config';
// import { User } from '../users/entities/user.entity';
// import { CleaningRequest } from '../requests/entities/request.entity';
// import { Project } from '../projects/entities/project.entity';
// import { Task } from '../projects/entities/task.entity';
// import { Review } from '../reviews/entities/review.entity';
// import { ProjectSupervisor } from '../projects/entities/project-supervisor.entity';

export const SEQUELIZE = 'SEQUELIZE'; // Provider Token

export const databaseProviders = [
  {
    provide: SEQUELIZE,
    inject: [ConfigService],
    useFactory: async (configService: ConfigService) => {
      const sequelize = new Sequelize({
        dialect: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        logging:
          configService.get<string>('NODE_ENV') === 'development'
            ? console.log
            : false,
        define: {
          underscored: true,
          timestamps: true,
        },
      });

    //   sequelize.addModels([
    //     User,
    //     CleaningRequest,
    //     Project,
    //     Task,
    //     Review,
    //     ProjectSupervisor,
    //   ]);

      try {
        await sequelize.authenticate();
        console.log('✅ ✅ ✅ Database connection established. ✅ ✅ ✅');
      } catch (error) {
        console.error('❌ ❌ ❌ Database connection failed: ❌ ❌ ❌', error);
        throw error;
      }

      return sequelize;
    },
  },
];
