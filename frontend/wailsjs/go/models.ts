export namespace database {
	
	export class Competition {
	    id: number;
	    name: string;
	    description: string;
	    settings: string;
	    // Go type: time
	    created_at: any;
	    // Go type: time
	    updated_at: any;
	
	    static createFrom(source: any = {}) {
	        return new Competition(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.settings = source["settings"];
	        this.created_at = this.convertValues(source["created_at"], null);
	        this.updated_at = this.convertValues(source["updated_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Participant {
	    id: number;
	    team_id: number;
	    full_name: string;
	    gender: sql.NullString;
	    birth_date: sql.NullString;
	    age: number;
	    // Go type: time
	    created_at: any;
	    // Go type: time
	    updated_at: any;
	
	    static createFrom(source: any = {}) {
	        return new Participant(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.team_id = source["team_id"];
	        this.full_name = source["full_name"];
	        this.gender = this.convertValues(source["gender"], sql.NullString);
	        this.birth_date = this.convertValues(source["birth_date"], sql.NullString);
	        this.age = source["age"];
	        this.created_at = this.convertValues(source["created_at"], null);
	        this.updated_at = this.convertValues(source["updated_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ParticipantResult {
	    participant_id: number;
	    full_name: string;
	    gender: string;
	    age: number;
	    penalty_points: number;
	    time_seconds: number;
	
	    static createFrom(source: any = {}) {
	        return new ParticipantResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.participant_id = source["participant_id"];
	        this.full_name = source["full_name"];
	        this.gender = source["gender"];
	        this.age = source["age"];
	        this.penalty_points = source["penalty_points"];
	        this.time_seconds = source["time_seconds"];
	    }
	}
	export class ParticipantStageDetail {
	    stage_id: number;
	    stage_name: string;
	    order_index: number;
	    participant_id: number;
	    full_name: string;
	    gender: string;
	    age: number;
	    team_name: string;
	    penalty_points: number;
	    time_seconds: number;
	
	    static createFrom(source: any = {}) {
	        return new ParticipantStageDetail(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.stage_id = source["stage_id"];
	        this.stage_name = source["stage_name"];
	        this.order_index = source["order_index"];
	        this.participant_id = source["participant_id"];
	        this.full_name = source["full_name"];
	        this.gender = source["gender"];
	        this.age = source["age"];
	        this.team_name = source["team_name"];
	        this.penalty_points = source["penalty_points"];
	        this.time_seconds = source["time_seconds"];
	    }
	}
	export class ParticipantWithResults {
	    id: number;
	    team_id: number;
	    full_name: string;
	    gender: string;
	    birth_date: string;
	    age: number;
	    team_name: string;
	    time_seconds: number;
	    penalty_points: number;
	
	    static createFrom(source: any = {}) {
	        return new ParticipantWithResults(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.team_id = source["team_id"];
	        this.full_name = source["full_name"];
	        this.gender = source["gender"];
	        this.birth_date = source["birth_date"];
	        this.age = source["age"];
	        this.team_name = source["team_name"];
	        this.time_seconds = source["time_seconds"];
	        this.penalty_points = source["penalty_points"];
	    }
	}
	export class Stage {
	    id: number;
	    competition_id: number;
	    name: string;
	    order_index: number;
	    // Go type: time
	    created_at: any;
	    // Go type: time
	    updated_at: any;
	
	    static createFrom(source: any = {}) {
	        return new Stage(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.competition_id = source["competition_id"];
	        this.name = source["name"];
	        this.order_index = source["order_index"];
	        this.created_at = this.convertValues(source["created_at"], null);
	        this.updated_at = this.convertValues(source["updated_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class StageResult {
	    id: number;
	    stage_id: number;
	    participant_id: number;
	    time_seconds: number;
	    penalty_points: number;
	    // Go type: time
	    created_at: any;
	    // Go type: time
	    updated_at: any;
	
	    static createFrom(source: any = {}) {
	        return new StageResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.stage_id = source["stage_id"];
	        this.participant_id = source["participant_id"];
	        this.time_seconds = source["time_seconds"];
	        this.penalty_points = source["penalty_points"];
	        this.created_at = this.convertValues(source["created_at"], null);
	        this.updated_at = this.convertValues(source["updated_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class StageTeamResult {
	    rank: number;
	    stage_id: number;
	    stage_name: string;
	    order_index: number;
	    team_id: number;
	    team_name: string;
	    total_penalties: number;
	    total_time: number;
	    avg_age: number;
	
	    static createFrom(source: any = {}) {
	        return new StageTeamResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.rank = source["rank"];
	        this.stage_id = source["stage_id"];
	        this.stage_name = source["stage_name"];
	        this.order_index = source["order_index"];
	        this.team_id = source["team_id"];
	        this.team_name = source["team_name"];
	        this.total_penalties = source["total_penalties"];
	        this.total_time = source["total_time"];
	        this.avg_age = source["avg_age"];
	    }
	}
	export class StageStanding {
	    stage_id: number;
	    stage_name: string;
	    order_index: number;
	    results: StageTeamResult[];
	
	    static createFrom(source: any = {}) {
	        return new StageStanding(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.stage_id = source["stage_id"];
	        this.stage_name = source["stage_name"];
	        this.order_index = source["order_index"];
	        this.results = this.convertValues(source["results"], StageTeamResult);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class TeamResultWithParticipants {
	    team_id: number;
	    team_name: string;
	    team_total_penalties: number;
	    team_total_time: number;
	    participant_count: number;
	    rank: number;
	    participants: ParticipantResult[];
	
	    static createFrom(source: any = {}) {
	        return new TeamResultWithParticipants(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.team_id = source["team_id"];
	        this.team_name = source["team_name"];
	        this.team_total_penalties = source["team_total_penalties"];
	        this.team_total_time = source["team_total_time"];
	        this.participant_count = source["participant_count"];
	        this.rank = source["rank"];
	        this.participants = this.convertValues(source["participants"], ParticipantResult);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class StageStandingWithParticipants {
	    stage_id: number;
	    stage_name: string;
	    order_index: number;
	    team_results: TeamResultWithParticipants[];
	
	    static createFrom(source: any = {}) {
	        return new StageStandingWithParticipants(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.stage_id = source["stage_id"];
	        this.stage_name = source["stage_name"];
	        this.order_index = source["order_index"];
	        this.team_results = this.convertValues(source["team_results"], TeamResultWithParticipants);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class Standing {
	    rank: number;
	    team_id: number;
	    team_name: string;
	    participant_count: number;
	    total_penalties: number;
	    total_time: number;
	    avg_age: number;
	    is_incomplete_team: number;
	
	    static createFrom(source: any = {}) {
	        return new Standing(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.rank = source["rank"];
	        this.team_id = source["team_id"];
	        this.team_name = source["team_name"];
	        this.participant_count = source["participant_count"];
	        this.total_penalties = source["total_penalties"];
	        this.total_time = source["total_time"];
	        this.avg_age = source["avg_age"];
	        this.is_incomplete_team = source["is_incomplete_team"];
	    }
	}
	export class Team {
	    id: number;
	    competition_id: number;
	    name: string;
	    // Go type: time
	    created_at: any;
	    // Go type: time
	    updated_at: any;
	
	    static createFrom(source: any = {}) {
	        return new Team(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.competition_id = source["competition_id"];
	        this.name = source["name"];
	        this.created_at = this.convertValues(source["created_at"], null);
	        this.updated_at = this.convertValues(source["updated_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace sql {
	
	export class NullString {
	    String: string;
	    Valid: boolean;
	
	    static createFrom(source: any = {}) {
	        return new NullString(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.String = source["String"];
	        this.Valid = source["Valid"];
	    }
	}

}

