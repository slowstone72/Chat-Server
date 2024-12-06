# Chat-Server
A Node.js chat server created to explore what's possible.

## Moderation
This server features an attempt at auto moderation aptly called autoMod. It makes use of a 'chaos level' integer, which is used to influence how strict the server's chat message filter is.

### Chat Filter Levels
Here's an explanation of the chat filter levels:

#### Level 1
- badWord becomes #######

#### Level 2:
- evenAgoodWordThatIncludesAbadWord becomes #################################
- Cocktail becomes ########

#### Level 3:
- Similar words to bad words are filtered, so even "budWord" is treated as a badWord.
- Messages don't send if filtered, and user is kicked.
This will likely prevent words with letter swaps from bypassing the filter.
- Text similar to but shorter than a badWord is not filtered.
            
### Notes on autoMod

The 'dynamic' element of a fluctuating chat filter level could be useful.
It might be a nice compromise between free speech and blasting the chat box with something unfavourable for 24 hours.

On the other hand it could end the world, I don't know. Either way, it's worth noting that this only really applies to English text anyway. autoMod is mainly intended to prevent people/bots from massively spamming the server 24/7 by shrinking the boundaries the more they are pushed, and then expanding them once things calm down.

So, yes, you can spam "poppycock" repeatedly, within certain conditions:
- you aren't sending it too quickly
- the autoMod chaos level isn't such that the server becomes super strict

The chaos level is influenced by:
- messages containing bad words
- messages sent too quickly
- abnormal amounts of new clients
- the amount of clients the server has kicked

Anything beyond that is out of the question for now.
