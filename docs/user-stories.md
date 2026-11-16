# User stories – De Groene Weide Online

There is one story per user-facing feature in [roadmap.md](roadmap.md). The feature number is in brackets after each title. Technical foundation features (F0.1, F0.2, F1.1, F1.5) have no story of their own, because they support the stories below.

Notes on the choices:
- The priorities follow Plan.md (*Onderdelen en prioriteit*). They are a proposal for the team to align on.
- "Guest" means any visitor of the website. A more specific role (family, guest with a disability, international guest) is used where the need is specific.
- "Bert" is the beheerder role. Receptionist, animation team member and seasonal worker are the other admin roles.

---

## Website

User Story: Choose my language (F0.4)

As an international guest
I want to read the whole website in English or German,
so that I understand the campsite and can book without a translation tool.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- The guest can switch between Dutch, English and German on every page.
- After switching, the guest stays on the same page in the new language.
- Every page in every language has its own web address that can be shared and found in search engines.
- Jokes are written per language and are never a literal translation.
- A page without a translation yet is not shown half in Dutch on the live site.

QUALITY CRITERIA (when is it good according to a professional):
- Translations are checked by a native speaker.
- The language choice is easy to find on every screen size.
- Search engines can see which page belongs to which language.

---

User Story: Turn off motion and sound (F0.3)

As a guest who is sensitive to stimuli
I want to turn off all motion and sound with one button,
so that I can use the website calmly.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- The guest can turn the calm mode on and off from every page.
- With calm mode on, nothing on the site moves or plays sound.
- The choice is remembered when the guest goes to another page or comes back later.
- A guest whose device is set to reduce motion sees no animations, even without pressing the button.

QUALITY CRITERIA (when is it good according to a professional):
- No animation or sound ever starts automatically.
- The button can be used with keyboard and screen reader.
- The site still looks finished and clear in calm mode.

---

User Story: Get a first impression on the home page (F2.1)

As a family with children
I want to see at a glance what makes the campsite special and what is on soon,
so that I quickly know whether this campsite suits us.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- The home page shows a short introduction, the activities, the next events and the location.
- The guest can start booking and plan a route directly from the home page.
- A joke of the day is shown in the guest's language.
- A temporary notice from Bert, such as "zwembad vandaag dicht", is visible when one is active.

QUALITY CRITERIA (when is it good according to a professional):
- The page loads fast on a phone with an average connection.
- The tone is warm and playful, with one joke per screen.
- Children can understand the main message through pictures and icons.

---

User Story: Discover the activities and facilities (F2.2)

As a family with children
I want to read what there is to do on the farm and at the facilities,
so that we know what to expect and can look forward to it.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- Each facility and activity has a photo, a short description, opening times and accessibility information.
- The guest can go from an activity straight to its spot on the map.
- Information that Bert changes in the admin panel is shown on the site without help from a developer.

QUALITY CRITERIA (when is it good according to a professional):
- Texts are short and in plain language.
- Every photo has a meaningful alt text.
- The layout works on phone, tablet and desktop.

---

User Story: See the event calendar (F2.3)

As a guest staying at the campsite
I want to see which activities are on per day and per week,
so that I can plan what we do tomorrow.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- The guest can view the events per day and per week and move to other days.
- Each event shows a title, time, place, age group and an icon for its kind.
- Recurring events, such as feeding the chickens every day, show up on every day they happen.
- Events that are still drafts are not visible to guests.
- A day without events shows a friendly message instead of an empty screen.

QUALITY CRITERIA (when is it good according to a professional):
- Dates and times are shown in the format of the chosen language.
- The calendar can be used fully with the keyboard.
- Icons are understandable without reading the text.

---

User Story: Get to know Bert and the team (F2.4)

As a guest
I want to read the story of the farm and the people behind it,
so that I feel welcome and trust the campsite.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- The page shows Bert's story, the team and the vision of the campsite.
- Bert can change the text and photos himself in the admin panel.
- The guest can go from this page to booking or contact.

QUALITY CRITERIA (when is it good according to a professional):
- The text is personal and fits the tone of voice.
- Photos of people are only used with their permission.
- The page reads well on a phone.

---

User Story: Contact the campsite (F2.5)

As a guest
I want to send a question and find the address, route and reception hours,
so that I get an answer without having to call late in the evening.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- The guest can send a message with name, email and question.
- After sending, the guest sees a confirmation that the message has arrived.
- Fields that are missing or wrong are explained next to the field.
- The page shows phone number, email address, address, route and reception hours.
- Messages from spam bots are stopped without the guest having to solve a puzzle.

QUALITY CRITERIA (when is it good according to a professional):
- No tracking cookies are used for spam protection.
- Only the data that is needed to answer is collected.
- Error messages are clear and are read out by screen readers.

---

User Story: Find accessibility, house rules and privacy information (F2.6)

As a guest with a disability
I want to read how accessible the terrain and facilities are,
so that I know beforehand whether I can stay here comfortably.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- The footer of every page links to accessibility, house rules and FAQ, and privacy and cookies.
- The accessibility page lists which facilities and plots are checked as accessible.
- Plots that have not been checked by Bert are clearly labelled as not checked.
- Bert can edit these pages himself.

QUALITY CRITERIA (when is it good according to a professional):
- The information is honest and never promises more than has been checked.
- The pages are written in plain language.
- The pages meet WCAG 2.2 level AA themselves.

---

User Story: Land on a friendly error page (F2.6)

As a guest
I want to see a friendly page when a page does not exist,
so that I can easily continue instead of getting stuck.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- A page that does not exist shows a page with the chicken and the joke "Deze koe is ontsnapt.", or its own joke in English or German.
- The page offers links to home, booking and contact.
- The page is shown in the language of the address the guest visited.

QUALITY CRITERIA (when is it good according to a professional):
- The page keeps the normal header and footer.
- The joke fits the tone and is not confusing.
- Search engines are told that the page does not exist.

---

User Story: Find the campsite in search engines (F2.7)

As Bert
I want my campsite to be easy to find in Google in three languages,
so that more people find and book the campsite.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- Every page has its own title and description in each language.
- Search engines can find all pages in all languages.
- Address, season and events are readable for search engines as structured data.
- Shared links show a title, description and image.

QUALITY CRITERIA (when is it good according to a professional):
- Pages score at least 90 on SEO in Lighthouse.
- Pages load fast, also on a phone.
- The Google Business Profile matches the information on the site.

---

User Story: Decide which cookies I accept (F0.5, F2.8)

As a guest
I want to choose whether non-essential cookies are used,
so that my privacy is respected.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- On a first visit the guest sees a cookie banner where non-essential cookies are off by default.
- The guest can accept or refuse with one click each.
- The guest can change the choice later from the footer.
- Visitor statistics work without tracking cookies.

QUALITY CRITERIA (when is it good according to a professional):
- The banner can be used with the keyboard and does not block reading the page longer than needed.
- The banner text is short and available in three languages.
- The site meets the AVG (GDPR).

---

## Site map

User Story: Explore the site map (F3.1–F3.3)

As a guest
I want to click on plots and facilities on a drawn map of the farm,
so that I can see where everything is before I book.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- Every plot and facility on the map can be selected and then shows its details.
- A plot shows number, type, electricity, surface, level ground, shade, accessibility, maximum persons, photo and distance to the facilities.
- A facility shows photo, description, opening times and accessibility.
- The guest can zoom in and out.
- The distances are correct for where the plots and facilities are on the map.

QUALITY CRITERIA (when is it good according to a professional):
- The map works with mouse, touch and keyboard.
- Tap areas are big enough on a phone.
- The map stays sharp on every screen size.

---

User Story: Use a list instead of the map (F3.2)

As a guest who uses a screen reader
I want to see all plots as a list with the same information as the map,
so that I can choose a plot without seeing the map.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- The guest can switch between map and list on the map page and in the booking flow.
- The list shows the same plots, statuses and details as the map.
- The guest can filter the list, for example on type or electricity.
- Choosing a plot in the list has the same result as choosing it on the map.

QUALITY CRITERIA (when is it good according to a professional):
- Each plot is announced with number and status, for example "Plek T14, vrij".
- Statuses can be recognised without colour.
- Switching views does not lose the chosen dates or plot.

---

## Booking

User Story: Choose my dates and group (F4.2, steps 1 and 2)

As a guest
I want to enter when we come and with whom,
so that I only see plots that fit our stay.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- The guest chooses an arrival and departure date and sees the number of nights.
- Dates outside the season (1 April to 31 October) cannot be chosen.
- A departure before or on the arrival date is refused with a clear message.
- The guest enters the number of adults and children and the type of accommodation.
- A stay shorter than Bert's minimum number of nights is refused with an explanation.

QUALITY CRITERIA (when is it good according to a professional):
- The date picker can be used with the keyboard and screen reader.
- The guest can go back a step without losing what was entered.
- Messages are friendly and say what to do.

---

User Story: Choose a numbered plot on the map (F4.2, step 4)

As a guest
I want to pick a free plot myself on the map for my dates,
so that I know exactly where we will stay.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- The map shows which plots are free, taken, blocked, chosen or recommended for the chosen dates.
- Taken and blocked plots are visible but cannot be chosen.
- After choosing, the guest sees the plot details and the total price for the stay.
- Plots that do not fit the group size or accommodation type cannot be chosen.

QUALITY CRITERIA (when is it good according to a professional):
- Each status uses colour plus a pattern or icon.
- Choosing a plot is announced to screen readers.
- The price shown is the same as the price in the confirmation.

---

User Story: Have my plot held while I book (F4.3)

As a guest
I want my chosen plot to be held for me while I fill in my details,
so that nobody else books it in the meantime.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- After choosing, the plot is held for 15 minutes and the guest sees how much time is left.
- The guest gets a warning shortly before the time runs out.
- When the time runs out, the plot becomes free again and the guest is sent back to the map with an explanation.
- A guest who chooses another plot releases the first one.
- One visitor cannot hold more plots at the same time than Bert allows.

QUALITY CRITERIA (when is it good according to a professional):
- Held plots are freed automatically, without anyone having to do anything.
- The countdown is announced politely, not every second.
- Holding cannot be abused by bots to block the campsite.

---

User Story: Enter my details and check my booking (F4.2, steps 5 and 6)

As a guest
I want to fill in only the necessary details and check everything before I confirm,
so that my booking is correct and my privacy is respected.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- The guest is asked only for name, email, phone, number of persons, accommodation type and remarks.
- Missing or invalid fields are explained next to the field.
- The check step shows plot, dates, persons, price breakdown and house rules.
- The guest can change each part from the check step.
- No payment data is asked for or stored.

QUALITY CRITERIA (when is it good according to a professional):
- Each field has a visible label and a short example.
- The form also works with autofill.
- The amount on the check step matches the amount in the email.

---

User Story: Get a booking confirmation (F4.4, F4.5)

As a guest
I want to see straight away that my booking or request is received and get an email about it,
so that I am sure our holiday is arranged.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- At booking level 1 the guest sees that the request is sent and that Bert will confirm it.
- At booking level 2 the guest sees that the booking is final.
- The guest receives an email in the language of the booking with plot, dates, price, route, house rules and a personal link.
- Bert receives a notice of each new booking or request.

QUALITY CRITERIA (when is it good according to a professional):
- The email arrives within a few minutes and does not end up in spam.
- The email reads well on a phone and without images.
- The chicken and the tone of voice are recognisable in the email.

---

User Story: Never book a plot that is already taken (F1.2, F4.4)

As Bert
I want the system to make it impossible to book the same plot twice for the same night,
so that guests never arrive at a plot that is already occupied.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- Two bookings for the same plot with overlapping nights can never both exist.
- When two guests confirm the same plot at the same time, only the first one succeeds.
- The second guest is sent back to the map with free alternatives of the same type.
- This also applies to bookings entered in the admin panel.

QUALITY CRITERIA (when is it good according to a professional):
- The rule is enforced by the database, not only by the screen.
- The double-booking test from the plan passes before every release.
- The guest who loses the plot gets a friendly explanation, not an error.

---

User Story: Change or cancel my booking (F4.6)

As a guest
I want to view and cancel my booking through a personal link,
so that I can arrange this myself without calling.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- The link in the email opens the guest's booking without an account.
- The guest sees the details and the cancellation conditions.
- The guest can cancel within Bert's conditions and gets a confirmation email.
- After cancelling, the plot is free again for other guests.
- A link that is invalid or expired shows a clear message.

QUALITY CRITERIA (when is it good according to a professional):
- The link cannot be guessed.
- The page shows no data of other guests.
- The page is available in the language of the booking.

---

User Story: Book on my phone (F3.2, F4.2)

As a family with children
I want to complete the whole booking on my phone,
so that I can book wherever I am.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- Every booking step can be completed on a phone without zooming the whole page.
- On the map, plot details open without hiding the chosen plot.
- The guest can always switch to the list view.

QUALITY CRITERIA (when is it good according to a professional):
- Tap targets are big enough for a thumb.
- The page does not scroll sideways.
- The flow tested with a parent and child succeeds without help.

---

## Admin panel

User Story: Log in safely (F1.4, F5.1)

As Bert
I want to log in with my own account and a second step,
so that nobody without permission can see guest data.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- Each team member logs in with their own account.
- After the password, a code from an authenticator app is required.
- Without the second step, no admin data is shown.
- A team member without an invitation cannot create an account.

QUALITY CRITERIA (when is it good according to a professional):
- Access is checked by the database, not only by the screen.
- Error messages do not reveal whether an email address exists.
- Logging in takes less than a minute for a new user with instructions.

---

User Story: Only see what my role allows (F1.3, F5.1)

As a seasonal worker
I want to see only the parts of the admin panel I am allowed to use,
so that I cannot change anything important by accident.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- Bert can do everything.
- Reception can manage bookings, messages and events, and can block plots.
- Animation can manage events and photos.
- A seasonal worker can only read.
- An action that is not allowed is refused, even when it is tried outside the screen.

QUALITY CRITERIA (when is it good according to a professional):
- The role test from the plan passes for every role.
- The menu only shows what the role may use.
- Rights are enforced in one place, in the database.

---

User Story: Start with my most-used actions (F5.2)

As Bert
I want to see my most-used actions and what needs attention as soon as I log in,
so that I can do my daily tasks quickly.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- The start screen has quick actions for a new event, adding a booking, blocking a plot and posting a notice.
- The start screen shows bookings waiting for confirmation and new messages.
- The start screen shows which texts still miss a translation.

QUALITY CRITERIA (when is it good according to a professional):
- The texts are in plain Dutch without technical terms.
- Bert finds each quick action without help.
- The start screen loads quickly.

---

User Story: Manage bookings (F5.3)

As a receptionist
I want to see all bookings in a list and calendar and confirm, change or cancel them,
so that I have one overview instead of an Excel file.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- The receptionist can find bookings by date, status, plot and guest name.
- The calendar shows per plot which nights are booked, held or blocked.
- The receptionist can confirm a request, which sends the guest a confirmation email.
- Changes and cancellations follow the same rules as guest bookings.
- The bookings can be exported to Excel for the accountant.

QUALITY CRITERIA (when is it good according to a professional):
- A change cannot cause a double booking.
- Deleting or cancelling always asks for confirmation.
- The export opens correctly in Excel.

---

User Story: Enter a phone or desk booking (F5.4)

As a receptionist
I want to enter a booking for a guest on the phone using the same map,
so that the plot is immediately taken for online guests too.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- The receptionist chooses dates, persons and a free plot on the same map as guests.
- The booking is marked as a phone or desk booking.
- The plot is immediately shown as taken on the public map.
- When an email address is given, the guest receives the confirmation in their language.

QUALITY CRITERIA (when is it good according to a professional):
- The same rules apply as for online bookings.
- Entering a booking takes no more than a few minutes.
- Bert and the reception can do this without help in the test.

---

User Story: Manage plots and block them (F5.5)

As Bert
I want to change the features of each plot and block a plot for a period,
so that guests see correct information and cannot book a plot in maintenance.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- Bert can change type, electricity, surface, level ground, shade, accessibility, maximum persons, price group and photo of each plot.
- Bert can mark a plot as checked on location for accessibility.
- Bert or the reception can block a plot for a period with a reason.
- A blocked plot cannot be booked in that period and shows as blocked on the map.
- Blocking a period that already has a booking gives a warning.

QUALITY CRITERIA (when is it good according to a professional):
- Distances are never entered by hand.
- Each field has a short explanation with an example.
- Changes are visible on the site right away.

---

User Story: Set prices and the season (F4.1, F5.6)

As Bert
I want to set the prices per plot type and period and the season dates,
so that guests always see the correct total price.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- Bert can set the season start and end date.
- Bert can set a price per night per price group and per period, such as the peak in July and August.
- Bert can set extra costs, such as tourist tax.
- A new price only applies to new bookings.
- Guests see the total price before they confirm.

QUALITY CRITERIA (when is it good according to a professional):
- The price calculation is correct at the edges of periods and the season.
- Amounts are shown in euros in the format of the chosen language.
- Bert can change a price without help in the test.

---

User Story: Manage events (F5.7)

As an animation team member
I want to create, copy and repeat events in three languages,
so that guests always see a current calendar.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- The team member can add an event with title, text, photo, time, place, age group and kind.
- An event can repeat, for example every day.
- An event can be saved as a draft and published later.
- An existing event can be copied.
- The screen shows which languages are still missing.

QUALITY CRITERIA (when is it good according to a professional):
- A preview shows how the event looks on the site.
- Deleting asks for confirmation.
- Each field has a short explanation with an example.

---

User Story: Edit page texts in three languages (F5.8)

As Bert
I want to change texts and photos on the pages myself, with the three languages side by side,
so that the site stays up to date without a developer.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- Bert can change headings, texts, photos and buttons per page block.
- Dutch, English and German are shown side by side.
- A label shows which translation is missing.
- Bert can preview the page before publishing.
- Bert can change the list of jokes per language.

QUALITY CRITERIA (when is it good according to a professional):
- The editor is in plain Dutch without code.
- A published change is visible on the site right away.
- An unfinished change is never visible to guests.

---

User Story: Upload photos with alt text (F5.9)

As an animation team member
I want to upload and crop photos and describe them,
so that the site has fresh photos that are also accessible.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- The team member can upload and crop a photo.
- A photo can only be saved with an alt text.
- The team member can see where a photo is used.
- A photo that is in use cannot be deleted without a warning.

QUALITY CRITERIA (when is it good according to a professional):
- Photos are made smaller automatically for fast loading.
- The alt text field explains with an example what to write.
- Uploading works on a phone.

---

User Story: Manage facility information (F5.10)

As Bert
I want to change the text, photo, opening times and accessibility of each facility,
so that guests see correct information on the map and the activities page.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- Bert can change text and accessibility per language for each facility.
- Bert can change the photo and opening times.
- Changes are visible on the map and the activities page right away.

QUALITY CRITERIA (when is it good according to a professional):
- The screen works the same way as the plot screen.
- Missing translations are shown.
- Each field has a short explanation.

---

User Story: Handle messages (F5.11)

As a receptionist
I want to read messages from the contact form and mark them as handled,
so that no question is forgotten.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- The receptionist sees all messages, with new ones marked.
- The receptionist can reply by email from the message.
- The receptionist can mark a message as handled.
- Messages older than Bert's retention period are removed automatically.

QUALITY CRITERIA (when is it good according to a professional):
- Only roles that are allowed can read messages.
- The overview shows the guest's language.
- The list stays clear with many messages.

---

User Story: Change settings and notices (F5.12)

As Bert
I want to change contact details, reception hours, temporary notices and switches like Plekmatch and the booking level,
so that I can adjust the site to the day without help.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- Bert can change contact details and reception hours.
- Bert can post a temporary notice per language and turn it off again.
- Bert can choose between booking level 1 (request) and 2 (instant confirmation).
- Bert can turn Plekmatch on and off.
- Bert can set the maximum number of plots one visitor can hold.

QUALITY CRITERIA (when is it good according to a professional):
- Each setting explains what it does.
- Changes are visible on the site right away.
- Important switches ask for confirmation.

---

User Story: Manage team accounts (F5.13)

As Bert
I want to invite team members, give them a role and revoke access,
so that every person has their own safe account.

PRIORITY: Must

ACCEPTANCE CRITERIA:
- Bert can invite a team member by email and choose a role.
- Bert can change a role or revoke access at any time.
- Bert can see whether each account has two-step verification turned on.
- Bert cannot remove his own administrator role by accident.

QUALITY CRITERIA (when is it good according to a professional):
- A revoked account loses access immediately.
- Only Bert can manage accounts.
- The screen is in plain Dutch.

---

## Shoulds

User Story: Ask the chicken for the best plot (F7.1)

As a family with children
I want to answer a few short questions and get the three best free plots,
so that we find a plot that suits us without knowing the terrain.

PRIORITY: Should

ACCEPTANCE CRITERIA:
- The chicken asks five short questions with icons, and the guest can go back.
- The result shows the three best free plots on the map, each with one sentence explaining why.
- Plots that do not meet a requirement, such as electricity or group size, are never shown.
- A plot that is not checked is never recommended as accessible.
- When no plot fits, the chicken shows the nearest similar plot and the dates on which the ideal plot is free.

QUALITY CRITERIA (when is it good according to a professional):
- The advice is rule-based and can be explained, without AI.
- Answers are never linked to a person.
- A child can understand the questions.

---

User Story: Get a reminder before arrival (F7.2)

As a guest
I want to get a reminder with the route and arrival times shortly before our stay,
so that we arrive well prepared.

PRIORITY: Should

ACCEPTANCE CRITERIA:
- The guest receives a reminder a set number of days before arrival.
- The reminder is in the language of the booking.
- The reminder contains the route, arrival times and the personal link.
- Cancelled bookings get no reminder.

QUALITY CRITERIA (when is it good according to a professional):
- Every reminder is sent exactly once.
- The email reads well on a phone.
- Bert can set the number of days.

---

User Story: Restore an earlier text and see who changed what (F7.3)

As Bert
I want to see earlier versions of a text and who changed something,
so that I can undo a mistake.

PRIORITY: Should

ACCEPTANCE CRITERIA:
- Bert can see earlier versions of a text with date and author.
- Bert can restore an earlier version.
- A log shows who changed what and when.

QUALITY CRITERIA (when is it good according to a professional):
- The log cannot be changed by other roles.
- Restoring asks for confirmation.
- The log is easy to read.

---

User Story: Show Facebook posts on the site (F7.4)

As Bert
I want my latest Facebook posts to appear on the website,
so that my 300 followers and website visitors see the same news.

PRIORITY: Should

ACCEPTANCE CRITERIA:
- The site shows the latest posts from Bert's Facebook page.
- The site keeps working when Facebook is unavailable.
- No Facebook scripts or cookies are loaded on the site.

QUALITY CRITERIA (when is it good according to a professional):
- Posts load without slowing down the page.
- Images from posts have alt text or are marked as decoration.
- The design fits the rest of the site.

---

User Story: Leave a Google review (F7.5)

As a happy guest
I want an easy way to leave a review after my stay,
so that other families can read about our experience.

PRIORITY: Should

ACCEPTANCE CRITERIA:
- The farewell email and the website contain a button to the Google review page.
- The farewell email contains a short satisfaction question with chicken icons.
- Answers to the satisfaction question are not linked to the guest's booking details.

QUALITY CRITERIA (when is it good according to a professional):
- The button opens the right review page directly.
- The question can be answered with one tap.
- The tone is friendly and not pushy.

---

## Could

User Story: Pay online (M8)

As a guest
I want to pay or pay a deposit online with iDEAL,
so that my booking is fully arranged in advance.

PRIORITY: Could

ACCEPTANCE CRITERIA:
- The guest can pay with iDEAL or a card through a payment provider.
- The booking is only marked as paid after the provider confirms the payment.
- A failed or cancelled payment gives a clear message and keeps the plot held for a short time.
- The site never stores payment data.

QUALITY CRITERIA (when is it good according to a professional):
- Payment status is always correct, also when the guest closes the browser.
- The payment page is available in three languages.
- Costs per payment are clear to Bert.
