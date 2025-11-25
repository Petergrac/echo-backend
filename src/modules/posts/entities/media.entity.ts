// media.entity.ts
import { Entity, Column, ManyToOne } from 'typeorm';
import { Post } from './post.entity';
import { Reply } from './reply.entity';
import { CoreEntity } from '../../../common/entities/common.entity';

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  GIF = 'gif',
}

@Entity()
export class Media extends CoreEntity {
  @Column()
  publicId: string;

  @Column()
  mediaUrl: string;

  @Column()
  resourceType: string;

  @Column({ nullable: true })
  postId: string;

  @Column({ nullable: true })
  replyId: string;

  /**
   * TODO ================ RELATIONS =======
   */
  @ManyToOne(() => Post, (post) => post.media, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  post: Post;

  @ManyToOne(() => Reply, (reply) => reply.media, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  reply: Reply;
}
