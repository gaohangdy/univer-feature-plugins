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

import type { Activity, ActivityParticipant, IActivityEvent } from '@convergence/convergence';
import type { IRange } from '@univerjs/core';
import type { Scene, SpreadsheetSkeleton } from '@univerjs/engine-render';
import type { ISetSelectionsOperationParams, ISheetLocationBase } from '@univerjs/sheets';
import type { IParticipantSelectionShapeProps } from '../views/shapes/participant-selection.shape';

import type { IParticipantPopup } from './popup.service';
import { ActivitySessionJoinedEvent, ActivitySessionLeftEvent, ActivityStateSetEvent } from '@convergence/convergence';

import { Disposable, ICommandService, ILogService, Inject, Injector } from '@univerjs/core';
import { IRenderManagerService } from '@univerjs/engine-render';
import { SelectionMoveType } from '@univerjs/sheets';
import { getCoordByCell, SheetSkeletonManagerService } from '@univerjs/sheets-ui';
import { type IParticipant, type ISetParticipantOperationParams, ParticipantsChangeOperation } from '../commands/operations/collaboration.operation';
import { ParticipantSelectionShape } from '../views/shapes/participant-selection.shape';
import { ActivityColorManager } from './activity-color-manager.service';
import { CollaborationService } from './collaboration.service';

const FIND_REPLACE_Z_INDEX = 10000;
const _SELECTION_KEY = 'selection';

export interface IRemoteSelection {
    participant?: IParticipant;
    range: IRange;
    shape: ParticipantSelectionShape;
}

export class SelectionService extends Disposable {
    // private static readonly _SELECTION_KEY = 'selection';
    private _activity: Activity;
    private _remoteSelectionsBySessionId: Map<string, IRemoteSelection> = new Map();

    // private _userName: string | undefined;
    // private _avatar: string | undefined;

    constructor(
        @Inject(Injector) private readonly _injector: Injector,
        @Inject(CollaborationService) private readonly _collaborationService: CollaborationService,
        @IRenderManagerService private readonly _renderManagerService: IRenderManagerService,
        @ICommandService private readonly _commandService: ICommandService,
        @Inject(ActivityColorManager) private readonly _activityColorManager: ActivityColorManager
    ) {
        super();

        this._collaborateStartup(
            this._collaborationService.getActivity()
        );
    }

    override dispose(): void {
        super.dispose();

        this._disposeRemoteSelections();
    }

    private _collaborateStartup(activity: Activity) {
        this._activity = activity;
        this._remoteSelectionsBySessionId = new Map();

        // this._userName = userName;
        // this._avatar = avatar;

        // Local -> Remote：监听本地命令执行，将本地用户选择范围信息发送到远端
        this._commandService.onCommandExecuted((command) => {
            if (command.id !== 'sheet.operation.set-selections') {
                return;
            }

            const params = command.params as ISetSelectionsOperationParams;
            if (params && params.type === SelectionMoveType.MOVE_END) {
                // console.log('选择范围发送: ', command, options);
                this._activity.setState(_SELECTION_KEY, command.params);
            }
        });

        // Remote -> Local：协同用户加入协同时，创建该用户选择范围
        this._activity.on(ActivitySessionJoinedEvent.EVENT_NAME, (e: IActivityEvent) => {
            const sessionJoinedEvent = e as ActivitySessionJoinedEvent;

            this._addRemoteSelection(sessionJoinedEvent.participant);
            this._commandService.executeCommand(ParticipantsChangeOperation.id, this._updateAliveParticipants(e, 'join'));
        });

        // Remote -> Local：协同用户退出协同时，释放该用户选择范围
        this._activity.on(ActivitySessionLeftEvent.EVENT_NAME, (e: IActivityEvent) => {
            const sessionLeftEvent = e as ActivitySessionLeftEvent;

            // 清除该用户选择范围
            this._disposeRemoteSelections(sessionLeftEvent.sessionId);
            this._commandService.executeCommand(ParticipantsChangeOperation.id, this._updateAliveParticipants(e, 'left'));
        });

        // Remote -> Local：监听远端活动状态变化，将远端用户选择范围信息同步到本地
        this._activity.on(ActivityStateSetEvent.EVENT_NAME, (e: IActivityEvent) => {
            const { key, value, sessionId, local, user } = e as ActivityStateSetEvent;
            if (!local && key === _SELECTION_KEY) {
                // console.log('收到远端选择范围: ', value, sessionId);
                this._updateRemoteSelection(sessionId, value, user.displayName);
            }
        });

        // Remote -> Local：初始化时，将远端用户选择范围信息同步到本地
        this._activity.participants().forEach((participant: ActivityParticipant) => {
            this._addRemoteSelection(participant);
        });
    }

    private _addRemoteSelection(participant: ActivityParticipant): void {
        if (!participant.local) {
            const selectionsOperation = participant.state.get(_SELECTION_KEY) || [];
            this._updateRemoteSelection(participant.sessionId, selectionsOperation, participant.user.displayName);
        }
    }

    private _updateRemoteSelection(sessionId: string, selectionsOperation: ISetSelectionsOperationParams, displayName: string | undefined): void {
        this._disposeRemoteSelections(sessionId);

        const unitId = selectionsOperation.unitId; //this._workbook.getUnitId();
        const skeletonManagerService = this._renderManagerService.getRenderById(unitId)?.with(SheetSkeletonManagerService);
        if (!skeletonManagerService) {
            return;
        }
        const skeleton = skeletonManagerService.getCurrent()?.skeleton;
        if (!skeleton) {
            return;
        }

        // const unitId = selectionsOperation.unitId; //this._workbook.getUnitId();
        const currentRender = this._renderManagerService.getRenderById(unitId);
        if (currentRender == null) {
            return;
        }

        const { scene } = currentRender;

        const color = this._activityColorManager.color(sessionId);

        // const activeSheetId = selectionsOperation.subUnitId; //worksheet.getSheetId();

        const remoteSelectionShap = new ParticipantSelectionShape(`remote-selection-range-${sessionId}`, this._getShapProps(scene, selectionsOperation, skeleton, color));
        // console.log('添加远端选择范围: ', selectionsOperation.selections[0].range, remoteSelectionShap);

        // sessionId: string;
        // name: string;
        // avatar: string;
        scene.addObjects([remoteSelectionShap]);

        let participant: IParticipant | undefined;
        if (displayName) {
            const { id, name, avatar } = JSON.parse(displayName);
            participant = {
                sessionId,
                id,
                name,
                avatar,
            };
        } else {
            participant = this._remoteSelectionsBySessionId.get(sessionId)?.participant;
        }
        this._remoteSelectionsBySessionId.set(sessionId,
            {
                participant,
                range: selectionsOperation.selections[0].range,
                shape: remoteSelectionShap,
            });

        scene.makeDirty();
    }

    private _getShapProps(scene: Scene, selectionsOperation: ISetSelectionsOperationParams, skeleton: SpreadsheetSkeleton, color: string) {
        const { startColumn, startRow, endColumn, endRow } = selectionsOperation.selections[0].range; //find.range.range;
        const startPosition = getCoordByCell(startRow, startColumn, scene, skeleton);
        const endPosition = getCoordByCell(endRow, endColumn, scene, skeleton);
        const { startX, startY } = startPosition;
        const { endX, endY } = endPosition;

        const width = endX - startX;
        const height = endY - startY;

        const props: IParticipantSelectionShapeProps = {
            left: startX,
            top: startY,
            color,
            width,
            height,
            evented: false,
            zIndex: FIND_REPLACE_Z_INDEX,
        };

        return props;
    }

    public getParticipantInfo(location: ISheetLocationBase): IParticipantPopup | null {
        // console.log('协同用户信息列表：', this._remoteSelectionsBySessionId);
        let participantInfo = null;
        this._remoteSelectionsBySessionId.forEach((item, key) => {
            const range = item.range;

            // console.log('当前单元格: ', location, range);
            if (location.unitId !== range.unitId || location.subUnitId !== range.sheetId) {
                return null;
            }

            if (location.col >= range.startColumn && location.col <= range.endColumn &&
                location.row >= range.startRow && location.row <= range.endRow) {
                // console.log('检索到协同用户选择范围: ', item);
                participantInfo = {
                    sessionId: key,
                    name: item.participant?.name,
                    avatar: item.participant?.avatar,
                    unitId: location.unitId,
                    subUnitId: location.subUnitId,
                    col: range.endColumn,
                    row: range.startRow,
                    range,
                };
            }
        });

        return participantInfo;
    }

    private _updateAliveParticipants(e: IActivityEvent, action: 'join' | 'left'): ISetParticipantOperationParams {
        const aliveParticipants: ISetParticipantOperationParams = {
            participants: [],
            join: null,
            left: null,
        };
        const participants = e.activity.participants(); // e.activity.participants().sort((a, b) => a.local ? -1 : 1);

        const { id, name, avatar } = e.user.displayName ? JSON.parse(e.user.displayName) : {};

        aliveParticipants.participants = [];
        participants.forEach((participant) => {
            const itemParticipant = participant.user.displayName ? JSON.parse(participant.user.displayName) : null;
            aliveParticipants.participants.push({
                sessionId: participant.sessionId,
                id: itemParticipant?.id,
                name: itemParticipant?.name,
                avatar: itemParticipant?.avatar,
            });
        });
        switch (action) {
            case 'join':
                aliveParticipants.join = {
                    sessionId: e.sessionId,
                    id,
                    name,
                    avatar,
                };
                this._injector.get(ILogService).log(`${e.user.displayName}加入协同`);
                break;
            case 'left':
                aliveParticipants.left = {
                    sessionId: e.sessionId,
                    id,
                    name,
                    avatar,
                };
                this._injector.get(ILogService).log(`${e.user.displayName}退出协同`);
                break;
        }
        return aliveParticipants;
    }

    private _disposeRemoteSelections(sessionId: string = ''): void {
        if (sessionId === '') {
            this._remoteSelectionsBySessionId.forEach((item) => {
                const shape = item.shape;
                shape.getScene()?.makeDirty();
                shape.dispose();
            });
            this._remoteSelectionsBySessionId = new Map();
        } else {
            const shape = this._remoteSelectionsBySessionId.get(sessionId)?.shape;
            if (shape) {
                shape.getScene()?.makeDirty();
                shape.dispose();
            }
            this._remoteSelectionsBySessionId.delete(sessionId);
        }
    }
}
