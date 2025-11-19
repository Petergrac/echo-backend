export class HashtagExtractor {
  /**
    * TODO ====================== EXTRACT HASHTAGS FROM CONTENT ======================
    * @param content 
    * @returns //? Array of unique, normalized hashtag names
    */
  static extractHashtags(content: string): string[] {
    if (!content) return [];

    const hashtagRegex = /#([\w\u0600-\u06FF\u4e00-\u9fff]+)/gi;
    const matches = content.match(hashtagRegex);
    
    if (!matches) return [];

    //* Normalize and deduplicate hashtags
    const normalizedHashtags = matches.map(tag => 
      tag.slice(1) // Remove # symbol
         .toLowerCase()
         .normalize('NFKC') //* Normalize unicode characters
    );

    return [...new Set(normalizedHashtags)]; //* Remove duplicates
  }

  /**
    * TODO ====================== VALIDATE HASHTAG ======================
    * @param hashtag 
    * @returns //? Check if hashtag meets platform requirements
    */
  static isValidHashtag(hashtag: string): boolean {
    if (!hashtag || hashtag.length > 50 || hashtag.length < 2) {
      return false;
    }

    //* Allow letters, numbers, underscores, and international characters
    const validRegex = /^[\w\u0600-\u06FF\u4e00-\u9fff]+$/;
    return validRegex.test(hashtag);
  }

  /**
    * TODO ====================== NORMALIZE HASHTAG ======================
    * @param hashtag 
    * @returns //? Standardize hashtag format for consistency
    */
  static normalizeHashtag(hashtag: string): string {
    return hashtag.toLowerCase().normalize('NFKC').trim();
  }
}