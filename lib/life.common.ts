// Declarations for common objects.

module life {

/**
 * An object that respresnts the changes from one generation to the next.
 */
export interface Changes {
  /**
   * The indices of all cells that came to life in this generation.
   */
  born : number[];

  /**
   * The indicies of all cells that survived in this generation.
   */
  survived : number[];

  /**
   * The indicies of all cells that died in this generation.
   */
  died : number[];
}

}