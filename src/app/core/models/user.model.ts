export interface UserModel {
  id: number;
  casId: string;
  email: string;
}

export interface MemberModel {
  id: number;
  points: number;
  firstName: string;
  lastName: string;
}

export interface UserProfileModel {
  user: UserModel;
  member: MemberModel;
}
