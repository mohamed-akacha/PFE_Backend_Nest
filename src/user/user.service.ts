import { ConflictException, HttpException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UserSubscribeDto } from './dto/user-subscribe.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { LoginCredentialsDto } from './dto/login-credentials.dto';
import { JwtService } from '@nestjs/jwt';
import { UserRoleEnum } from '../enums/user-role.enum';
import { UserEntity } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private jwtService: JwtService
  ) {
  }
  async seedUser(userData: UserSubscribeDto): Promise<Partial<UserEntity>> {

    const user = this.userRepository.create({
      ...userData
    });
    user.salt = await bcrypt.genSalt();
    user.password = await bcrypt.hash(user.password, user.salt);
    try {
      return await this.userRepository.save(user);
    } catch (e) {
      console.log(e.message);
      if (e.errno === 1062) {
        throw new ConflictException('Le username et le email doivent être unique');
      }
      throw new InternalServerErrorException();
    }

  }
  async usersCount(): Promise<Number> {
    try {
      
      return await this.userRepository.count();
    } catch (error) {
      throw new InternalServerErrorException(`Une erreur est survenue lors de la récupération des utilisateurs: ${error}`);
    }
  }


  
  async createUser(userReq: UserEntity, userData: UserSubscribeDto): Promise<Partial<UserEntity>> {

    if (!this.isAdmin(userReq)) {
      throw new UnauthorizedException("Vous n'êtes pas autorisé à effectuer cette action.");
    }
    const user = this.userRepository.create({
      ...userData
    });
    user.salt = await bcrypt.genSalt();
    user.password = await bcrypt.hash(user.password, user.salt);
    try {
      return await this.userRepository.save(user);
      /* return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
      }; */
    } catch (e) {
      //  console.log(e);
      if (e.errno === 1062) {
        // Le username ou l'email existe déjà
        throw new ConflictException('Le username et le email doivent être unique');
      }
      throw new InternalServerErrorException();
    }

  }

  async login(credentials: LoginCredentialsDto) {

    // Récupére le login et le mot de passe
    const { email, password } = credentials;
    // On peut se logger ou via le mail 
    // Vérifier est ce qu'il y a un user avec ce login ou ce mdp
    const user = await this.userRepository.createQueryBuilder("user")
      .where("user.email = :email",
        { email }
      )
      .getOne();
    // console.log(user);
    // Si not user je déclenche une erreur
    if (!user)
      throw new NotFoundException('Email ou mot de passe incorrect.');
    // Si oui je vérifie est ce que le mot est correct ou pas
    const hashedPassword = await bcrypt.hash(password, user.salt);
    if (hashedPassword === user.password) {
      const payload = {
        username: user.username,
        email: user.email,
        role: user.role
      };
      const jwt = await this.jwtService.sign(payload);
      return {
        "access_token": jwt
      };
    } else {
      // Si mot de passe incorrect je déclenche une erreur
      throw new NotFoundException('Email ou mot de passe incorrect.');
    }
  }

/*   async updateUser(id: number, updateUserDto: UpdateUserDto, userReq: UserEntity): Promise<Partial<UserEntity>> {
  if (!this.isAdmin(userReq)) {
    throw new UnauthorizedException("Vous n'êtes pas autorisé à effectuer cette action.");
  }

  const user = await this.getUserById(id);
  if (!user) {
    throw new NotFoundException('Utilisateur non trouvé.');
  }

  // Apply updates from DTO to user entity
  user.username = updateUserDto.username ?? user.username;
  user.email = updateUserDto.email ?? user.email;
  user.tel = updateUserDto.tel ?? user.tel;

  // Hash password if present in DTO
  if (updateUserDto.password) {
    user.salt = await bcrypt.genSalt();
    user.password = await bcrypt.hash(updateUserDto.password, user.salt);
  }

  try {
    return await this.userRepository.save(user);
  } catch (e) {
    if (e.errno === 1062) {
      // Le username ou l'email existe déjà
      throw new ConflictException('Le username et le email doivent être unique');
    }
    throw new InternalServerErrorException();
  }
} */


  /*  isOwnerOrAdmin(objet, user) {
     return user.role === UserRoleEnum.ADMIN || (objet.user && objet.user.id === user.id);
   } */

   async findAll(userReq: UserEntity, options = null): Promise<UserEntity[]> {
    try {
      if (!this.isAdmin(userReq)) {
        throw new UnauthorizedException("Vous n'êtes pas autorisé à effectuer cette action.");
      }
      if (options) {
        return await this.userRepository.find(options);
      }
      return await this.userRepository.find();
    } catch (error) {
      throw new InternalServerErrorException(`Une erreur est survenue lors de la récupération des utilisateurs: ${error}`);
    }
  }
  

  async getUserById(idUser?: number): Promise<UserEntity | null> {
    const user = await this.userRepository.createQueryBuilder('user')
      .where('user.id = :id', { id: idUser })
      .getOne();
    return user || null;
  }


  

  async softDeleteUser(userReq: UserEntity, userId: number): Promise<string> {
    
    try {
     
      if (!this.isAdmin(userReq)) {
        throw new UnauthorizedException("Vous n'êtes pas autorisé à effectuer cette action.");
      }
      const result = await this.userRepository.softDelete({ id: userId });
      if (result.affected === 0) {
        throw new NotFoundException(`Impossible de trouver l'utilisateur avec l'ID ${userId}.`);
      }
      return 'Utilisateur supprimé avec succès' ;
    } catch (error) {
      throw new InternalServerErrorException("Une erreur est survenue lors de la suppression de l'utilisateur.");
    }
  }
  


  async restoreUser(userReq: UserEntity, userId: number): Promise<UserEntity> {
    if (!this.isAdmin(userReq)) {
      throw new UnauthorizedException("Vous n'êtes pas autorisé à effectuer cette action.");
    }
  
    const result = await this.userRepository.restore({ id: userId });
    if (result.affected === 0) {
      throw new NotFoundException(`Impossible de restaurer l'utilisateur avec l'ID ${userId}.`);
    }
  
    const restoredUser = await this.getUserById(userId);
    if (!restoredUser) {
      throw new NotFoundException(`Impossible de trouver l'utilisateur restauré avec l'ID ${userId}.`);
    }
  
    return restoredUser;
  }
  
  
  async deleteUser(userReq: UserEntity, userId: number): Promise<string> {
    // Vérifier si l'utilisateur est autorisé à effectuer cette action
    if (!this.isAdmin(userReq)) {
      throw new UnauthorizedException("Vous n'êtes pas autorisé à effectuer cette action.");
    }
    
    // Supprimer l'utilisateur en utilisant son ID
    const result = await this.userRepository.delete(userId);
    
    // Vérifier si l'utilisateur a été supprimé
    if (result.affected === 0) {
      throw new NotFoundException(`Impossible de trouver l'utilisateur avec l'ID ${userId}.`);
    }
    return `L'utilisateur a été supprimée définitivement avec succès.`;
  }
  



  // Méthode privée pour vérifier si l'utilisateur est un administrateur
  isAdmin(user: UserEntity): boolean {
    return user.role === UserRoleEnum.ADMIN;
  }

  // Méthode privée pour vérifier si l'utilisateur est bien le propriétaire de l'inspection
  isOwner(user: UserEntity, objet): boolean {
    return (objet.user && objet.user.id === user.id);
  }
}


