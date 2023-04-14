"use strict";

// This is the global list of the stories, an instance of StoryList
let storyList;

/** Get and show stories when site first loads. */

async function getAndShowStoriesOnStart() {
  storyList = await StoryList.getStories();
  $storiesLoadingMsg.remove();

  putStoriesOnPage();
}

/**
 * A render method to render HTML for an individual Story instance
 * - story: an instance of Story
 *
 * Returns the markup for the story.
 */

function generateStoryMarkup(story) {
  // console.debug("generateStoryMarkup", story);

  const hostName = story.getHostName();
  return $(`
      <li id="${story.storyId}">
        <i class="bi bi-star story-star"></i>
        <a href="${story.url}" target="a_blank" class="story-link">
          ${story.title}
        </a>
        <small class="story-hostname">(${hostName})</small>
        <small class="story-author">by ${story.author}</small>
        <small class="story-user">posted by ${story.username}</small>
      </li>
    `);
}

/** Gets list of stories from server, generates their HTML, and puts on page. */

function putStoriesOnPage() {
  console.debug("putStoriesOnPage");

  $allStoriesList.empty();

  // loop through all of our stories and generate HTML for them
  for (let story of storyList.stories) {
    const $story = generateStoryMarkup(story);
    $allStoriesList.append($story);
  }

  $allStoriesList.show();
}

/** Get list of favorites from server, generates their HTML, and puts on page */

function putFavoritesOnPage(){
  console.log("putFavoritesOnPage runs")

  $allStoriesList.empty();

  // loop through all of our favorites and generate HTML
  for (let story of currentUser.favorites){
    console.log(story)
    const $story = generateStoryMarkup(story);
    $allStoriesList.append($story);
  }

  $allStoriesList.show();
}

$navFavorites.on("click", putFavoritesOnPage)

//FIXME: the favorites tab doesn't update with the newly added stories

/** Set event listener for clicking on a star, add the corresponding story
 * with the clicked star to the user's favorites list */

$allStoriesList.on("click", ".story-star", async function(evt){
  evt.preventDefault()
  console.log("a star is clicked!")

  let $storyMarkup = $(evt.target).closest("li")
  console.log("$storyMarkup", $storyMarkup)

  let $storyId = $storyMarkup[0].id
  console.log("$storyId", $storyId)

  let storyInstance = await axios({
    url: `${BASE_URL}/stories/${$storyId}`,
      method: "GET",
      params: {
        storyId: $storyId
      }
  })

  await currentUser.addFavorite(storyInstance.data.story)

  // maybe prepend the markup of the new fav story into the favorites
})


/** Get data from the add new story form, calls .addStory method to create
 * a new instance of Story, and put that story on the page */

async function grabAndShowStory(evt) {
  evt.preventDefault();
  $addStoryForm.toggle();

  // grab the author, title, and url
  const title = $("#title").val();
  const author = $("#author").val();
  const url = $("#url").val();

  const storyInfo = {
    title,
    author,
    url
  };

  const newStory = await storyList.addStory(currentUser, storyInfo);
  console.log("newStory ==>", newStory);

  const $storyMarkup = generateStoryMarkup(newStory);
  console.log('storyMarkup ==>', $storyMarkup);

  $allStoriesList.prepend($storyMarkup);
}

$storyFormSubmit.on("click", grabAndShowStory);


