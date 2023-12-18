import muppetize from './muppetize';
import muppetizeMessageCommands from './muppetizeMessage';
import muppetizeUserCommands from './muppetizeUser';

export default [muppetize, ...muppetizeMessageCommands, ...muppetizeUserCommands];
