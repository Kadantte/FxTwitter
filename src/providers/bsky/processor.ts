import { Context } from 'hono';
import { Constants } from '../../constants';
import { DataProvider } from '../../enum';
import { handleMosaic } from '../../helpers/mosaic';

export const buildAPIBskyPost = async (
  c: Context,
  status: BlueskyPost,
  language: string | undefined
  // eslint-disable-next-line sonarjs/cognitive-complexity
): Promise<APIStatus> => {
  const apiStatus: APIStatus = {} as APIStatus;
  apiStatus.id = status.cid;
  apiStatus.text = status.record?.text ?? status.value?.text;
  apiStatus.author = {
    id: status.author.handle,
    name: status.author.displayName,
    screen_name: status.author.handle,
    avatar_url: status.author.avatar,
    banner_url: '', // TODO: Pull this from the actual author endpoint
    description: '',
    location: '',
    followers: 0,
    following: 0,
    likes: 0,
    url: `${Constants.BSKY_ROOT}/profile/${status.author.handle}`,
    protected: false,
    statuses: 0,
    joined: status.author.createdAt,
    birthday: {
      day: 0,
      month: 0,
      year: 0
    },
    website: {
      url: '',
      display_url: ''
    }
  };
  apiStatus.created_at = status.record?.createdAt ?? status.value?.createdAt;
  apiStatus.media = {};

  console.log('embed', status.embed);

  apiStatus.media.photos = (status.embed?.images || []).map(image => {
    apiStatus.embed_card = 'summary_large_image';
    console.log('image', image)

    return {
      type: 'photo',
      width: image.aspectRatio?.width,
      height: image.aspectRatio?.height,
      url: image.fullsize,
      altText: image.alt
    };
  });
  if (status?.record?.embed?.video || status?.value?.embed?.video || status?.embed?.media?.$type === 'app.bsky.embed.video#view') {
    apiStatus.embed_card = 'player';
    const video = status.record?.embed?.video ?? status.value?.embed?.video ?? status?.record?.embed?.media;
    apiStatus.media.videos = [
      {
        type: 'video',
        url: status.embed.playlist ?? status.embed.media?.playlist ?? `${Constants.BSKY_VIDEO_BASE}/watch/did:plc:${video?.ref?.$link}/720p/video.m3u8`,
        format: video?.mimeType ?? 'video/mp4',
        thumbnail_url: status.embed.thumbnail ?? status.embed.media?.thumbnail ?? `${Constants.BSKY_VIDEO_BASE}/watch/did:plc:${video?.ref?.$link}/thumbnail.jpg`,
        variants: [],
        width: status.embed.aspectRatio?.width ?? status.embed.media?.aspectRatio?.width,
        height: status.embed.aspectRatio?.height ?? status.embed.media?.aspectRatio?.height,
        duration: 0
      }
    ];
  }
  if (status.embed?.record) {
    apiStatus.quote = await buildAPIBskyPost(c, status.embed?.record?.record, language);
  }
  apiStatus.media.all = (apiStatus.media.photos as APIMedia[] || []).concat(apiStatus.media.videos ?? []);

  /* Handle photos and mosaic if available */
  if ((apiStatus?.media.photos?.length || 0) > 1 && Constants.MOSAIC_BSKY_DOMAIN_LIST.length > 0) {
    const mosaic = await handleMosaic(apiStatus.media?.photos || [], ':3', DataProvider.Bsky);
    if (typeof apiStatus.media !== 'undefined' && mosaic !== null) {
      apiStatus.media.mosaic = mosaic;
    }
  }

  apiStatus.likes = status.likeCount;
  apiStatus.replies = 0;
  apiStatus.reposts = status.repostCount;
  apiStatus.source = 'Bluesky Social';
  apiStatus.url = `${Constants.BSKY_ROOT}/profile/${status.author.handle}/post/${status.cid}`;
  apiStatus.provider = DataProvider.Bsky;

  return apiStatus;
};