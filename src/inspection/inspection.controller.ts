import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Roles } from 'src/decorators/roles.decorator';
import { User } from 'src/decorators/user.decorator';
import { UserEntity } from 'src/user/entities/user.entity';
import { JwtAuthGuard } from 'src/user/guards/jwt-auth.guard';
import { RoleGuard } from 'src/user/Guards/rôles.guard';
import { UserService } from 'src/user/user.service';
import { AddInspectionDto } from './dto/add-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { InspectionEntity } from './entites/inspection.entity';
import { InspectionService } from './inspection.service';

@Controller('inspections')
@UseGuards(JwtAuthGuard,RoleGuard)
export class InspectionController {
  constructor(
    private inspectionService: InspectionService,
    private userService: UserService,
  ) {}

  @Post()
  @Roles('admin')
  async createInspection(
    @User() user: UserEntity,
    @Body() inspectionDto: AddInspectionDto,
  ) {
    try {
      return await this.inspectionService.createInspection(user, inspectionDto);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new NotFoundException(error.message);
    }
  }

  @Get()
  @Roles('admin','user')
  async getAllInspections(@User() user: UserEntity): Promise<InspectionEntity[]> {
    try {
      return await this.inspectionService.getAllInspections(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new NotFoundException(error.message);
    }
  }

  @Get(':id')
  @Roles('admin', 'user')
  async getInspectionById(
    @User() user: UserEntity,
    @Param('id', ParseIntPipe) inspectionId: number,
  ): Promise<InspectionEntity> {
    try {
      return await this.inspectionService.getInspectionById(user, inspectionId);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new NotFoundException(error.message);
    }
  }

  @Patch(':id')
  @Roles('admin','user')
  async updateInspection(
    @User() user: UserEntity,
    @Param('id', ParseIntPipe) inspectionId: number,
    @Body() updateInspectionDto: UpdateInspectionDto,
  ): Promise<InspectionEntity> {
    try {
      return await this.inspectionService.updateInspection(
        user,
        inspectionId,
        updateInspectionDto,
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new NotFoundException(error.message);
    }
  }

  @Delete(':id')
  @Roles('admin')
  async softDeleteInspection(
    @User() user: UserEntity,
    @Param('id', ParseIntPipe) inspectionId: number,
  ): Promise<void> {
    try {
      await this.inspectionService.softDeleteInspection(user, inspectionId);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new NotFoundException(error.message);
    }
  }


  @Roles('admin')
  @Post('restore/:id')
  async restoreInspection(
    @User() user: UserEntity,
    @Param('id', ParseIntPipe) inspectionId: number,
  ): Promise<void> {
    try {
      await this.inspectionService.restoreInspection(user, inspectionId);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new NotFoundException(error.message);
    }
  }

  @Roles('admin')
  @Delete('force/:id')
  async deleteInspection(
    @User() user: UserEntity,
    @Param('id', ParseIntPipe) inspectionId: number,
  ): Promise<void> {
    try {
      await this.inspectionService.deleteInspection(user, inspectionId);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new NotFoundException(error.message);
    }
  }
  }

  