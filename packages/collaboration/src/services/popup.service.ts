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

import type { IDisposable, IRange, Nullable } from '@univerjs/core';
import type { ISheetLocationBase } from '@univerjs/sheets';
import { Disposable, DisposableCollection, Inject, Injector, IUniverInstanceService } from '@univerjs/core';
import { type ICanvasPopup, SheetCanvasPopManagerService } from '@univerjs/sheets-ui';
import { BehaviorSubject } from 'rxjs';
import { ParticipantPopup } from '../views/ParticipantPopup';
import { SelectionService } from './selection.service';

export interface IParticipantPopup extends ISheetLocationBase {
    sessionId: string;
    name: string;
    avatar: string;
    range: IRange;
}

// interface IParticipantPopupOptions extends ISheetLocationBase {
//     customRange?: Nullable<ICustomRange>;
//     customRangeRect?: Nullable<IBoundRectNoAngle>;
//     showAll?: boolean;
// }

export class ParticipantPopupService extends Disposable {
    private _lastPopup: Nullable<IDisposable> = null;
    private _activePopup: IParticipantPopup | null; // Nullable<IParticipantPopup>;
    private _activePopup$ = new BehaviorSubject<IParticipantPopup | null>(null);

    activePopup$ = this._activePopup$.asObservable();

    get activePopup() {
        return this._activePopup;
    }

    constructor(
        @Inject(SheetCanvasPopManagerService) private readonly _sheetCanvasPopManagerService: SheetCanvasPopManagerService,
        @Inject(Injector) private readonly _injector: Injector,
        @IUniverInstanceService private readonly _univerInstanceService: IUniverInstanceService,
        @Inject(SelectionService) private readonly _selectionService: SelectionService
    ) {
        super();

        this.disposeWithMe(() => {
            this._activePopup$.complete();
        });
    }

    showPopup(location: IParticipantPopup, onHide?: () => void) {
        const { row, col, unitId, subUnitId } = location;

        if (
            this._activePopup &&
            row === this._activePopup.row &&
            col === this._activePopup.col &&
            unitId === this._activePopup.unitId &&
            subUnitId === this.activePopup?.subUnitId
        ) {
            this._activePopup = location;
            this._activePopup$.next(location);
            return;
        }
        if (this._lastPopup) {
            this._lastPopup.dispose();
        };

        this._activePopup = location;
        this._activePopup$.next(location);

        const popup: ICanvasPopup = {
            componentKey: ParticipantPopup.componentKey,
            direction: 'horizontal',
            onClickOutside: () => {
                this.hidePopup();
            },
            onClick: () => {
                this.hidePopup();
            },
        };

        // console.log('----开始绘制提示----', location);
        const popupDisposable = this._sheetCanvasPopManagerService.attachPopupToCell(
            row,
            col,
            popup,
            location.unitId,
            location.subUnitId
        );

        if (!popupDisposable) {
            throw new Error('[SheetsThreadCommentPopupService]: cannot show popup!');
        }

        const disposableCollection = new DisposableCollection();
        disposableCollection.add(popupDisposable);
        disposableCollection.add({
            dispose: () => {
                onHide?.();
            },
        });

        this._lastPopup = disposableCollection;
    }

    hidePopup() {
        if (!this._activePopup) {
            return;
        }
        if (this._lastPopup) {
            this._lastPopup.dispose();
        }
        this._lastPopup = null;

        this._activePopup = null;
        this._activePopup$.next(null);
    }
}
