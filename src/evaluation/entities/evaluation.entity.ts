import { Max, Min } from "class-validator";
import { BlocEntity } from "src/bloc/entities/bloc.entity";
import { EvaluationPointEntity } from "src/evaluation-point/entities/evaluation-point.entity";
import { TimestampEntites } from "src/generics/timestamp.entites.";
import { InspectionEntity } from "src/inspection/entites/inspection.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity({name: 'evaluations'})
export class EvaluationEntity extends TimestampEntites {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Min(0)
  @Max(10)
  score: number;

  @Column({ nullable: true })
  pieceJointe?: string;
/* 
  @Column({ nullable: true })
  commentaire:String */

  @ManyToOne(() => InspectionEntity, inspection => inspection.evaluations)
  inspection: InspectionEntity;

  @ManyToOne(() => EvaluationPointEntity, evaluationPoint => evaluationPoint.evaluations)
  evaluationPoint: EvaluationPointEntity;

  @ManyToOne(() => BlocEntity, bloc => bloc.evaluations, { onUpdate: 'CASCADE' })
  bloc: BlocEntity;

}
