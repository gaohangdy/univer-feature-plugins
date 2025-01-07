/**
 * Copyright 2023-present DreamNum Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { ActivityParticipant } from '@convergence/convergence';
import type { IAccessor, IOperation } from '@univerjs/core';
import { CommandType } from '@univerjs/core';

export interface IParticipant {
    sessionId: string;
    id: string;
    name: string;
    avatar: string;
}
export interface ISetParticipantOperationParams {
    participants: IParticipant[];
    join: IParticipant | null;
    left: IParticipant | null;
}

// export const ParticipantJoinOperation: IOperation<ActivityParticipant> = {
//     id: 'collaboration.command.participant.join',
//     type: CommandType.OPERATION,
//     handler: (accessor: IAccessor, params?: ActivityParticipant) => {
//         return true;
//     },
// };

// export const ParticipantLeaveOperation: IOperation<string> = {
//     id: 'collaboration.command.participant.leave',
//     type: CommandType.OPERATION,
//     handler: (accessor: IAccessor, params?: string) => {
//         return true;
//     },
// };

export const ParticipantsChangeOperation: IOperation<ISetParticipantOperationParams> = {
    id: 'collaboration.command.participants.change',
    type: CommandType.OPERATION,
    handler: () => {
        return true;
    },
};
