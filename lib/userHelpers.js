import { db } from './db.js';

/**
 * Get user sidebar data for layout
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User data for sidebar
 */
export async function getUserSidebarData(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get user data
    const user = await db
        .selectFrom('users')
        .select(['display_name', 'rating', 'grade', 'skill_level', 'school_id'])
        .where('id', '=', userId)
        .executeTakeFirst();
    
    // Count today's games
    const countResult = await db
        .selectFrom('games')
        .select(db.fn.count('id').as('count'))
        .where((eb) => eb.or([
            eb('sente_id', '=', userId),
            eb('gote_id', '=', userId)
        ]))
        .where('created_at', '>=', today.toISOString())
        .executeTakeFirst();
    
    // If user has school_id, fetch school name
    let schoolName = '';
    if (user?.school_id) {
        const school = await db
            .selectFrom('schools')
            .select('display_name')
            .where('id', '=', user.school_id)
            .executeTakeFirst();
        schoolName = school?.display_name || '';
    }
    
    return {
        userName: user?.display_name || 'プレイヤー',
        userSchool: schoolName,
        userGrade: user?.grade || '',
        userRating: user?.rating || 1500,
        todayGames: Number(countResult?.count) || 0
    };
}
