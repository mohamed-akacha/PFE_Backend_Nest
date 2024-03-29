import { ConflictException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { LoginCredentialsDto } from "./dto/login-credentials.dto";
import { UserEntity } from "./entities/user.entity";
import * as bcrypt from 'bcrypt';
import { promises as fs } from 'fs';
import { UserSubscribeDto } from "./dto/user-subscribe.dto";
import { isAdmin } from "./shared.utils";
import { MailService } from "src/mail/mail.service";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserService } from "./user.service";
import { UserRSubscribeDto } from "./dto/real-user-create.dto";
@Injectable()
export class AuthService {
    //constructor
    constructor(@InjectRepository(UserEntity)
        private userRepository: Repository<UserEntity>,
        private jwtService: JwtService,
        private readonly mailService: MailService,
        private readonly userService:UserService) { }
    //authentification
    async login(credentials: LoginCredentialsDto) {
        // Récupére le login et le mot de passe
        const { email, password } = credentials;
        const user = await this.userRepository
            .createQueryBuilder("user")
            .where("user.email = :email", { email })
            .getOne();
        if (!user)
            throw new NotFoundException('Compte inexistant.');
        const hashedPassword = await bcrypt.hash(password, user.salt);
        if (hashedPassword === user.password) {
            const payload = {
                username: user.username,
                email: user.email,
                role: user.role
            };
            const jwt = await this.jwtService.sign(payload);
            return { "access_token": jwt };
        }
        else {
            throw new NotFoundException('Mot de passe incorrect.');
        }
    }
    //Creation d'un utilisateur
    async createUser(userReq: UserEntity, userData: UserRSubscribeDto)
        : Promise<any> {
        if (!isAdmin(userReq)) {
            throw new UnauthorizedException("Vous n'êtes pas autorisé à effectuer cette action.");
        }
        const user = this.userRepository.create({
            ...userData
        });
        try {
            const savedUser = await this.userRepository.save(user);
            const saltRounds = 10;
            const userId = savedUser.id.toString();
            const salt = await bcrypt.genSalt(saltRounds);
            const hash = await bcrypt.hash(userId, salt);
            const hashedId = hash.slice(7);
            const hash_userId = `${hashedId}_${userId}`;
            const encodedHash_userId = encodeURIComponent(hash_userId);
            const newUrl = `http://localhost:3000/auth/confirm/${encodedHash_userId}`;
            // Send email to the savedUser's email (via gmail.com)
            await this.mailService.sendConfirmationEmail(
                savedUser.email,
                "New user",
                newUrl,
            );
        }
        catch (e) {
            console.log(e.message);
            if (e.errno === 1062) {
                throw new ConflictException('Le username et le email doivent être unique');
            }
            throw new InternalServerErrorException();
        }
    }
    // Confirmation d'un compte
    async confirmAccount(id: number, updateUserDto: UpdateUserDto): Promise<Partial<UserEntity>> {
        const user = await this.userService.getUserById(id);
        if (!user) {
          throw new NotFoundException('Utilisateur non trouvé.');
        }
        if(user.username || user.username.trim()==""){
            throw new NotFoundException('Compte déjà confirmé.'); 
        }
        user.username = updateUserDto.username;
        user.role=user.role;
        user.email = user.email;
        user.tel = updateUserDto.tel;
        user.salt = await bcrypt.genSalt();
        user.password = await bcrypt.hash(updateUserDto.password, user.salt);
        try {
            return await this.userRepository.save(user);
        } 
        catch (e){
            if (e.errno === 1062) {
                throw new ConflictException('Le username et le email doivent être unique');
            }
            throw new InternalServerErrorException();
        }
    }
}