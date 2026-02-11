export interface AddMission {
    name:string
    description?:string
    max_crew: number;
    difficulty: string; 
    due_date?: string;  
}
