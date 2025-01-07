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

import type { Nullable } from '@univerjs/core';
import type { IShapeProps, UniverRenderingContext } from '@univerjs/engine-render';
import { Rect, Shape } from '@univerjs/engine-render';

export interface IParticipantSelectionShapeProps extends IShapeProps {
    color: string;
}

export class ParticipantSelectionShape extends Shape<IParticipantSelectionShapeProps> {
    protected _color: Nullable<string>;

    constructor(key?: string, props?: IParticipantSelectionShapeProps) {
        super(key, props);

        if (props) {
            this.setShapeProps(props);
        }

        this.onPointerEnter$.subscribeEvent(() => {
            // console.log('远端选择范围进入: ', this);
        });
    }

    setShapeProps(props: Partial<IParticipantSelectionShapeProps>): void {
        if (typeof props.color !== 'undefined') {
            this._color = props.color;
        }

        this.transformByState({
            width: props.width!,
            height: props.height!,
        });
    }

    protected override _draw(ctx: CanvasRenderingContext2D): void {
        // const borderColor = `rgb(${this._color!.r}, ${this._color!.g}, ${this._color!.b})`;

        Rect.drawWith(ctx as UniverRenderingContext, {
            width: this.width,
            height: this.height,
            // fill: this._color,
            stroke: this._color, // borderColor,
            strokeWidth: 1,
            evented: false,
        });
    }
}
