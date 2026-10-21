/** Thrown when input data breaks one of Splitly's money rules. */
export class SplitlyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SplitlyError";
  }
}
