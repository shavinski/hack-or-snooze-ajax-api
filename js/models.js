"use strict";

const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";

/******************************************************************************
 * Story: a single story in the system
 */

class Story {

  /** Make instance of Story from data object about story:
   *   - {title, author, url, username, storyId, createdAt}
   */

  constructor({ storyId, title, author, url, username, createdAt }) {
    this.storyId = storyId;
    this.title = title;
    this.author = author;
    this.url = url;
    this.username = username;
    this.createdAt = createdAt;
  }

  /** Parses hostname out of URL and returns it. */

  getHostName() {
    const startIndex = this.url.indexOf('/') + 2;
    let hostname = this.url.slice(startIndex, this.url.length);

    // if last index equal to forward slash
    if (hostname.slice(-1) === '/') {
      hostname = this.url.slice(startIndex, this.url.length - 1);
    }

    return hostname;
  }

  static async getStory(storyId) {
    const response = await axios({
      url: `${BASE_URL}/stories/${storyId}`,
      method: "GET",
    });

    return new Story(response.data.story);
  }
}

/******************************************************************************
 * List of Story instances: used by UI to show story lists in DOM.
 */

class StoryList {
  constructor(stories) {
    this.stories = stories;
  }

  /** Generate a new StoryList. It:
   *
   *  - calls the API
   *  - builds an array of Story instances
   *  - makes a single StoryList instance out of that
   *  - returns the StoryList instance.
   */

  static async getStories() {
    // Note presence of `static` keyword: this indicates that getStories is
    //  **not** an instance method. Rather, it is a method that is called on the
    //  class directly. Why doesn't it make sense for getStories to be an
    //  instance method?

    // query the /stories endpoint (no auth required)
    const response = await axios({
      url: `${BASE_URL}/stories`,
      method: "GET",
    });

    // turn plain old story objects from API into instances of Story class
    const stories = response.data.stories.map(story => new Story(story));

    // build an instance of our own class using the new array of stories
    return new StoryList(stories);
  }

  /** Adds story data to API, makes a Story instance, adds it to story list.
   * - user - the current instance of User who will post the story
   * - obj of {title, author, url}
   *
   * Returns the new Story instance
   */

  async addStory(user, newStory) {
    console.log('addStory==>', newStory);

    const response = await axios({
      url: `${BASE_URL}/stories`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: {
        token: user.loginToken,
        story: {
          title: newStory.title,
          author: newStory.author,
          url: newStory.url
        }
      }
    });

    const currentStory = new Story(response.data.story);
    console.log('currentStory ==>', currentStory);

    this.stories.unshift(currentStory);
    //TODO: this.stories is all the stories, each user has an array of stories
    // that they have written, which will also need to be updated

    return currentStory;
  }
}

/******************************************************************************
 * User: a user in the system (only used to represent the current user)
 */

class User {
  /** Make user instance from obj of user data and a token:
   *   - {username, name, createdAt, favorites[], ownStories[]}
   *   - token
   */

  constructor({
    username,
    name,
    createdAt,
    favorites = [],
    ownStories = []
  },
    token) {
    this.username = username;
    this.name = name;
    this.createdAt = createdAt;

    // instantiate Story instances for the user's favorites and ownStories
    this.favorites = favorites.map(s => new Story(s));
    this.ownStories = ownStories.map(s => new Story(s));

    // store the login token on the user so it's easy to find for API calls.
    this.loginToken = token;
  }

  /** Check if a story is one of the user's favorites
   * Takes as input a story instance, returns true or false
   */

  isFavorite(story) {
    //TODO: try sum at some point
    for (let favStory of this.favorites) {
      if (favStory.storyId === story.storyId) {
        return true;
      }
    }
    return false;
  }

  /**
   * Add story to user favorites, takes a story instance as input
   */

  async addFavorite(story) {
    //TODO: you only want to push and slice from favorites if you know the
    // axios call has suceeded
    // need error handling, check axios response, maybe try/catch

    await axios({
      url: `${BASE_URL}/users/${this.username}/favorites/${story.storyId}`,
      method: "POST",
      data: {
        token: this.loginToken,
        username: this.username,
        storyId: story.storyId,
      }
    });

    this.favorites.push(story);
  }

  /**
   * Remove story from user favorites, takes a story instance as input
   */

  async removeFavorite(story) {

    await axios({
      url: `${BASE_URL}/users/${this.username}/favorites/${story.storyId}`,
      method: "DELETE",
      data: {
        token: this.loginToken,
        username: this.username,
        storyId: this.storyId,
      }
    });

    this.favorites.splice(this.favorites.indexOf(story), 1);
  }

  /** Register new user in API, make User instance & return it.
   *
   * - username: a new username
   * - password: a new password
   * - name: the user's full name
   */

  static async signup(username, password, name) {
    const response = await axios({
      url: `${BASE_URL}/signup`,
      method: "POST",
      data: { user: { username, password, name } },
    });

    const { user } = response.data;

    return new User(
      {
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        favorites: user.favorites,
        ownStories: user.stories
      },
      response.data.token
    );
  }

  /** Login in user with API, make User instance & return it.

   * - username: an existing user's username
   * - password: an existing user's password
   */

  static async login(username, password) {
    const response = await axios({
      url: `${BASE_URL}/login`,
      method: "POST",
      data: { user: { username, password } },
    });

    const { user } = response.data;

    return new User(
      {
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        favorites: user.favorites,
        ownStories: user.stories
      },
      response.data.token
    );
  }

  /** When we already have credentials (token & username) for a user,
   *   we can log them in automatically. This function does that.
   */

  static async loginViaStoredCredentials(token, username) {
    try {
      const response = await axios({
        url: `${BASE_URL}/users/${username}`,
        method: "GET",
        params: { token },
      });

      const { user } = response.data;

      return new User(
        {
          username: user.username,
          name: user.name,
          createdAt: user.createdAt,
          favorites: user.favorites,
          ownStories: user.stories
        },
        token
      );
    } catch (err) {
      console.error("loginViaStoredCredentials failed", err);
      return null;
    }
  }
}
