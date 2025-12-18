import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

export const PasswordValidator = (minLength:number, maxLength:number):ValidatorFn =>{
    return (control:AbstractControl):ValidationErrors | null =>{
        const password = control.value as string

        if(!password) return {require:true}
        else if (password.length < minLength) return {invalidMinLength : true}
        else if (password.length > maxLength) return {invalidMaxLength : true}
        else if(!/[a-z]/.test(password)) return {invalidLowcase:true}
        else if(!/[A-Z]/.test(password)) return {invalidUppercase:true}
        else if(!/[0-9]/.test(password)) return {invalidNumberic:true}
        else if(!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return {invalidSpacialChar:true}
        
        return null
    }
}