export enum MediaTypeKey {
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
}

export class Media {
  protected constructor(
    protected id: string = crypto.randomUUID(),
    protected url: string,
    protected type: MediaTypeKey,
    private createdAt: Date = new Date(),
    private updatedAt: Date = new Date(),
  ) {
    if (!Media.isValidHttpUrl(url)) {
      throw new Error("Invalid URL. Must start with http:// or https://");
    }
  }

  protected static isValidHttpUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

   public touch() {
    this.updatedAt = new Date();
  }

  get getId(){
    return this.id;
  }

  get getUrl() {
    return this.url;
  }

  get getType() {
    return this.type;
  }

  setUrl(newUrl: string) {
    if (!Media.isValidHttpUrl(newUrl)) {
      throw new Error("Invalid URL. Must start with http:// or https://");
    }
    this.url = newUrl;
    this.touch();
  }

  setType(newType: MediaTypeKey){
    this.type = newType;
    this.touch();
  }
}

export class VideoMedia extends Media {
  private constructor(url: string, id?: string) {
    super(id, url, MediaTypeKey.VIDEO);
  }

  static create(props: { url: string; id?: string }): VideoMedia {
    return new VideoMedia(props.url, props.id);
  }
}

export class ImageMedia extends Media {
  private constructor(url: string, id?: string) {
    super(id, url, MediaTypeKey.IMAGE);
  }

  static create(props: { url: string; id?: string }): ImageMedia {
    return new ImageMedia(props.url, props.id);
  }
}
