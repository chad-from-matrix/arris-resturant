import { format, parseISO, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { DATE_FORMATS } from '../constants/config';

// Format date for display
export const formatDate = (date, formatString = DATE_FORMATS.DISPLAY) => {
    if (!date) return '';
    try {
        const dateObj = typeof date === 'string' ? parseISO(date) : date;
        return format(dateObj, formatString);
    } catch (error) {
        console.error('Error formatting date:', error);
        return '';
    }
};

// Get days until a date
export const getDaysUntil = (date) => {
    if (!date) return null;
    try {
        const targetDate = typeof date === 'string' ? parseISO(date) : date;
        return differenceInDays(targetDate, new Date());
    } catch (error) {
        console.error('Error calculating days until:', error);
        return null;
    }
};

// Check if birthday is coming up (within N days)
export const isBirthdayUpcoming = (birthDate, daysAhead = 5) => {
    if (!birthDate) return false;

    try {
        const today = new Date();
        const currentYear = today.getFullYear();

        // Create birthday for current year
        const birth = typeof birthDate === 'string' ? parseISO(birthDate) : birthDate;
        const birthdayThisYear = new Date(currentYear, birth.getMonth(), birth.getDate());

        // If birthday already passed this year, check next year
        let upcomingBirthday = birthdayThisYear;
        if (birthdayThisYear < today) {
            upcomingBirthday = new Date(currentYear + 1, birth.getMonth(), birth.getDate());
        }

        const daysUntilBirthday = differenceInDays(upcomingBirthday, today);
        return daysUntilBirthday >= 0 && daysUntilBirthday <= daysAhead;
    } catch (error) {
        console.error('Error checking upcoming birthday:', error);
        return false;
    }
};

// Get all days in a month
export const getDaysInMonth = (year, month) => {
    const start = startOfMonth(new Date(year, month));
    const end = endOfMonth(new Date(year, month));
    return eachDayOfInterval({ start, end });
};

// Add days to a date
export const addDaysToDate = (date, days) => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return addDays(dateObj, days);
};

// Calculate age from birth date
export const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    try {
        const birth = typeof birthDate === 'string' ? parseISO(birthDate) : birthDate;
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }

        return age;
    } catch (error) {
        console.error('Error calculating age:', error);
        return null;
    }
};

// Get current month and year
export const getCurrentMonthYear = () => {
    return format(new Date(), DATE_FORMATS.MONTH_YEAR);
};

// Parse date string to Date object
export const parseDate = (dateString) => {
    try {
        return parseISO(dateString);
    } catch (error) {
        console.error('Error parsing date:', error);
        return null;
    }
};
