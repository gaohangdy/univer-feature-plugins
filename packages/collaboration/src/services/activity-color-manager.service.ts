import type {
    Activity,
    ActivitySessionJoinedEvent,
    ActivitySessionLeftEvent,
    IConvergenceEvent,
} from '@convergence/convergence';
import { ColorAssigner } from '@convergence/color-assigner';
import { Disposable, ICommandService, Inject } from '@univerjs/core';
import { filter } from 'rxjs/operators';
import { CollaborationService } from './collaboration.service';

export class ActivityColorManager extends Disposable {
    private readonly _colorAssigner: ColorAssigner;
    constructor(
        @Inject(CollaborationService) private readonly _collaborationService: CollaborationService
    ) {
        super();
        this._colorAssigner = new ColorAssigner();
        this._collaborateStartup(this._collaborationService.getActivity());
    }

    private _collaborateStartup(activity: Activity) {
        activity.events()
            //@ts-ignore
            .pipe(filter((e: IConvergenceEvent) => e.name === 'session_joined'))
            //@ts-ignore
            .subscribe((e: ActivitySessionJoinedEvent) => {
                this._addSession(e.sessionId);
            });

        activity.events()
            //@ts-ignore
            .pipe(filter((e: IConvergenceEvent) => e.name === 'session_left'))
            //@ts-ignore
            .subscribe((e: ActivitySessionLeftEvent) => {
                this._removeSession(e.sessionId);
            });
    }

    public color(sessionId: string): string {
        return this._colorAssigner.getColorAsHex(sessionId);
    }

    private _addSession(sessionId: string): void {
        this._colorAssigner.getColor(sessionId);
    }

    private _removeSession(sessionId: string): void {
        this._colorAssigner.releaseColor(sessionId);
    }
}
