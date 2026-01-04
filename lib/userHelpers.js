import { supabase } from './supabase.js';

/**
 * Get user sidebar data for layout
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User data for sidebar
 */
export async function getUserSidebarData(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Execute all queries in parallel
    const [
        { data: user },
        { count }
    ] = await Promise.all([
        supabase
            .from('users')
            .select('display_name, rating, grade, skill_level, school_id')
            .eq('id', userId)
            .single(),
        supabase
            .from('games')
            .select('*', { count: 'exact', head: true })
            .or(`player_sente_id.eq.${userId},player_gote_id.eq.${userId}`)
            .gte('created_at', today.toISOString())
    ]);
    
    // If user has school_id, fetch school name
    let schoolName = '';
    if (user?.school_id) {
        const { data: school } = await supabase
            .from('schools')
            .select('display_name')
            .eq('id', user.school_id)
            .single();
        schoolName = school?.display_name || '';
    }
    
    return {
        userName: user?.display_name || 'プレイヤー',
        userSchool: schoolName,
        userGrade: user?.grade || '',
        userRating: user?.rating || 1500,
        todayGames: count || 0
    };
}
