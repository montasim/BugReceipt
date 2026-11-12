import { Composition, Still } from 'remotion';
import { Marketing, TOTAL } from './Marketing';
import { Thumbnail } from './Thumbnail';
import { Launch, LAUNCH_TOTAL, LaunchThumbnail } from './Launch';

export const Root = () => (
  <>
    <Composition id="Marketing" component={Marketing} durationInFrames={TOTAL} fps={30} width={1920} height={1080} />
    <Composition id="Launch" component={Launch} durationInFrames={LAUNCH_TOTAL} fps={30} width={1920} height={1080} />
    <Still id="Thumbnail" component={Thumbnail} width={1280} height={720} />
    <Still id="LaunchThumbnail" component={LaunchThumbnail} width={1280} height={720} />
  </>
);
