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

import { Disposable, ICommandService, Inject, IPermissionService, IUniverInstanceService } from '@univerjs/core';
import { IRenderManagerService } from '@univerjs/engine-render';
import { HoverManagerService } from '@univerjs/sheets-ui';
import { ComponentManager } from '@univerjs/ui';
import { debounceTime } from 'rxjs';
import { ParticipantPopupService } from '../services/popup.service';
import { SelectionService } from '../services/selection.service';
import { ParticipantPopup } from '../views/ParticipantPopup';

export class ParticipantPopupController extends Disposable {
    constructor(
        @Inject(HoverManagerService) private readonly _hoverManagerService: HoverManagerService,
        @Inject(ParticipantPopupService) private readonly _participantPopupService: ParticipantPopupService,
        @Inject(IRenderManagerService) private readonly _renderManagerService: IRenderManagerService,
        @Inject(IPermissionService) private readonly _permissionService: IPermissionService,
        @ICommandService private readonly _commandService: ICommandService,
        @IUniverInstanceService private readonly _univerInstanceService: IUniverInstanceService,
        @Inject(ComponentManager) private readonly _componentManager: ComponentManager,
        @Inject(SelectionService) private readonly _selectionService: SelectionService
    ) {
        super();

        this._initComponent();
        this._initHoverListener();
    }

    private _initComponent() {
        ([
            [ParticipantPopup.componentKey, ParticipantPopup],
        ] as const).forEach(([key, comp]) => {
            this._componentManager.register(key, comp);
        });
    }

    private _initHoverListener() {
        this.disposeWithMe(
            // hover over not editing cell
            this._hoverManagerService.currentCell$.pipe(debounceTime(200)).subscribe((cell) => {
                const currentPopup = this._participantPopupService.activePopup;
                if (!cell) {
                    return;
                }
                if (!currentPopup) {
                    if (!cell) {
                        this._participantPopupService.hidePopup();
                        return;
                    }

                    const participantInfo = this._selectionService.getParticipantInfo(cell?.location);

                    // console.log('-----------获取到用户选择范围信息-----------');
                    if (participantInfo == null) {
                        // console.log('没有获取到用户选择范围信息');
                        return;
                    }

                    // console.log('participantInfo', participantInfo);
                    this._participantPopupService.showPopup(participantInfo);
                } else {
                    // console.log('当前有popup: ', currentPopup);
                    if (cell.location.row < currentPopup.range.startRow || cell.location.row > currentPopup.range.endRow || cell.location.col < currentPopup.range.startColumn || cell.location.col > currentPopup.range.endColumn) {
                        this._participantPopupService.hidePopup();
                    }
                }
            })
        );
    }
}
