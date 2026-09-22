import { leaveApi } from '@/lib/driver-leave-api';
export const GET = (req: Request) => leaveApi(req, false);
export const POST = (req: Request) => leaveApi(req, false);
