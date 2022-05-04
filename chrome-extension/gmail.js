(()=>{var e={};
/**
 * @license
 * Copyright 2022 Helen Hastings
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */function n(e){var t,a="";if(e.mimeType.includes("plain")&&(a=a.concat((t=e.body.data,atob(t.replace(/-/g,"+").replace(/_/g,"/"))))),e.mimeType.includes("multipart")){const t=e.parts.map((e=>n(e)));a=a.concat(t.join(" "))}return a}e={isRecruiting:function(e){const t=n(e.payload);return t.includes("your background")||t.includes("great fit")},getPlainTextFromMsgPart:n};var t={};
/**
 * @license
 * Copyright 2022 Helen Hastings
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */async function a(e,n,t,a){var o={method:n,headers:{authorization:`Bearer ${a}`,"Content-Type":"application/json"}};null!==t&&(o.body=JSON.stringify(t));const s=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/"+e,o);if(!s.ok){const e=await s.json();throw new Error(`${s.status} response from Google API: ${JSON.stringify(e)}`)}return s.json()}async function o(e,n,t){return pathWithParams=e+"?"+new URLSearchParams(n).toString(),a(pathWithParams,"GET",null,t)}async function s(e,n,t){return a(e,"POST",n,t)}t={getMessages:async function(e,n,t,a){(null==n||n>100)&&(console.log("We're capping this query to 100 messages at once to avoid gmail api concurrency limits."),n=100);var s="";t&&(s=`before:${Math.floor(t/1e3)} `),null!==a&&a>0&&(s+=`after:${Math.floor(a/1e3)} `);var i={maxResults:n};s.length&&(i.q=s);const r=(await o("messages",i,e)).messages.map((async function(n){return await o(`messages/${n.id}`,{},e)}));return await Promise.all(r)},getOrCreateLabel:async function(e,n){const t=await async function(e,n){const t=await o("labels",{},n);for(var a=0;a<t.labels.length;a++)if(t.labels[a].name.toLowerCase()==e.toLowerCase())return t.labels[a].id;return null}(e,n);return t||async function(e,n){const t={name:e};return(await s("labels",t,n)).id}(e,n)},labelMessages:async function(e,n,t){const a={ids:e,addLabelIds:[n]};await s("messages/batchModify",a,t)},threadHasLabel:async function(e,n,t){const a=(await o(`threads/${e}`,{},t)).messages;for(var s=0;s<a.length;s++)if(a[s].labelIds.includes(n))return!0;return!1}},
/**
 * @license
 * Copyright 2022 Helen Hastings
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
console.log("hello from gmail.js");const i="Recruiting";async function r(){console.log("button clicked"),chrome.identity.getAuthToken({interactive:!0},(async function(n){console.log(n),console.log("Checking for label Recruiting and creating if it does not exist.");const a=await t.getOrCreateLabel(i,n),o=function(n){const t=[];for(var a=0;a<n.length;a++)try{console.log(e.isRecruiting),e.isRecruiting(n[a])&&(t.push(n[a].id),console.log(n[a].snippet+" IS RECRUITING"))}catch(e){console.log(`error in deciding message [${n[a].snippet}]:`),console.log(e)}return t}(await t.getMessages(n,1,null,null));o.length>0&&(console.log(`Found ${o.length} recruiting messages. Labeling them now.`),t.labelMessages(o,a,n))}))}window.onload=function(){document.querySelector("button").addEventListener("click",r)}})();
//# sourceMappingURL=gmail.js.map
