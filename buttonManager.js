
class ButtonManager {
  constructor(analysisManager, CSSManager) {
    this.CSSManager = CSSManager;
    this.analysisManager = analysisManager;
    this.buttons = {
      postSummary: null,
      commentSummary: null,
      sentiment: null,
    };
    this.buttonsAdded = false;
    this.processedThreadIDs = new Set();
  }

  resetButtons() {
    Object.keys(this.buttons).forEach((key) => {
      if (this.buttons[key]) {
        this.buttons[key].remove();
        this.buttonsAdded = false;
      }
    });
  }

  async addButtonsInPage(storedApiKey) {
    const mainThreadDivs = document.querySelectorAll('.scrollerItem[data-testid="post-container"]');

    for (let mainThreadDiv of mainThreadDivs) {
      const redditThreadID = mainThreadDiv.id.split('_')[1];

      if (!this.processedThreadIDs.has(redditThreadID)) {
        this.processedThreadIDs.add(redditThreadID);
        const isTextPost = await this.analysisManager.isTextPost(redditThreadID);
        const shareSpan = mainThreadDiv.querySelector('.icon-share');
        const mainThreadDivChild = mainThreadDiv.lastChild;

        const buttonContainerPost = this.createButtonContainer();
        const buttonContainerPost2 = this.createButtonContainer();

        if (isTextPost) {
          const postSummaryButton = this.createInPagePostSummaryButton(storedApiKey, mainThreadDivChild.lastChild, redditThreadID);
          buttonContainerPost.appendChild(postSummaryButton);
          this.insertBefore(buttonContainerPost, shareSpan);
        }

        const commentSummaryButton = this.createInPageCommentSummaryButton(storedApiKey, mainThreadDivChild.lastChild, redditThreadID);
        buttonContainerPost2.appendChild(commentSummaryButton);
        this.insertBefore(buttonContainerPost2, shareSpan);
      }
    }
  }

  insertBefore(newElement, referenceElement) {
    const parentElement = referenceElement.parentNode.parentNode.parentNode;
    const lastChildElement = parentElement.lastElementChild;
    parentElement.insertBefore(newElement, lastChildElement);
  }

  async addButtonsInThread(storedApiKey) {
    this.resetButtons();
    this.buttonsAdded = true;
    try {
      const postContent = this.analysisManager.extractPost();
      if (postContent.length > 1000) {
        const buttonContainerPost = this.createButtonContainer();
        const postEndDiv = document.querySelector('div[data-test-id="post-content"] div[data-adclicklocation="media"]').lastElementChild;
        this.buttons.postSummary = this.createPostSummaryButton(storedApiKey, postEndDiv);
        buttonContainerPost.appendChild(this.buttons.postSummary);
        this.insertAfter(buttonContainerPost, postEndDiv);
      }
    } catch (error) {
      console.error("Post Text non existing");
    }

    const buttonContainerComments = this.createButtonContainer();
    const commentsThreadFilterDiv = document.querySelector('#CommentSort--SortPicker').parentNode.parentNode.parentNode;

    this.buttons.commentSummary = this.createCommentSummaryButton(storedApiKey, commentsThreadFilterDiv);
    this.buttons.sentiment = this.createSentimentButton(storedApiKey, commentsThreadFilterDiv);

    buttonContainerComments.appendChild(this.buttons.commentSummary);
    buttonContainerComments.appendChild(this.buttons.sentiment);

    this.insertAfter(buttonContainerComments, commentsThreadFilterDiv);
  }


  

  createButtonContainer()
  {
    const buttonContainer = document.createElement("div");
    this.CSSManager.createButtonContainerStyle(buttonContainer);
    return buttonContainer;
  }

  createInPagePostSummaryButton(storedApiKey, commentsThreadFilterDiv, threadID)
  {
    const prompt = 'create a summary and sentiment analysis of it, start with Post Summary : ';
    return this.createAnalysisButton(storedApiKey, commentsThreadFilterDiv, "Post Summary", "post-summary-analysis", prompt, "postPage", threadID);
  }

  createInPageCommentSummaryButton(storedApiKey, commentsThreadFilterDiv, threadID)
  {
    var postTitle = this.analysisManager.extractTitleInPage(commentsThreadFilterDiv);
    var prompt = 'create a good summary of it and sentiment analysys, the title of the thread is: ' + postTitle + '. Start with Comments Summary: ';
    return this.createAnalysisButton(storedApiKey, commentsThreadFilterDiv, "Sum Comments", "comments-summary-analysis", prompt, "commentsPage", threadID);
  }
  
  createPostSummaryButton(storedApiKey, commentsThreadFilterDiv)
  {
    const prompt = 'create a summary and sentiment analysis of it, start with Post Summary: ';
    return this.createAnalysisButton(storedApiKey, commentsThreadFilterDiv, "Post Summary", "post-summary-analysis", prompt,"post");
  }

  createCommentSummaryButton(storedApiKey, commentsThreadFilterDiv)
  {
    var postTitle = this.analysisManager.extractTitleInThread();
    var prompt = 'create a summary of it, the title of the thread is: ' + postTitle+'. Start with Comments Summary: ';
    return this.createAnalysisButton(storedApiKey, commentsThreadFilterDiv, "Summary", "comments-summary-analysis", prompt, "comments");
  }

  createSentimentButton(storedApiKey, commentsThreadFilterDiv)
  {
    var postTitle = this.analysisManager.extractTitleInThread();
    const prompt = 'create a short, sentiment analysis of these comments, be direct, dont give me a summary of the comments , the title of the thread is: ' + postTitle +' .Start with Comments Sentiment Analysis: ';
    return this.createAnalysisButton(storedApiKey, commentsThreadFilterDiv, "Sentiment Analysis", "sentiment-analysis", prompt, "comments");
  }

  createAnalysisButton(storedApiKey, commentsThreadFilterDiv, text, className, prompt, analysisType, threadID)
  {
    
    const button = this.createButton(text, className);
    button.onclick = async () =>
    {
      this.disableButton(button);
      var content = "empty";
      if (analysisType == "post")
        content = this.analysisManager.extractPost();
      else if (analysisType == "comments")
        content = this.analysisManager.extractComments();
      else if (analysisType == "postPage")
        content = await this.analysisManager.getPostDataFromAPI(threadID);
      else if (analysisType == "commentsPage")
        content = await this.analysisManager.getPostCommentsFromAPI(threadID);
      const analysis = await this.analysisManager.getAnalysis(storedApiKey, content, prompt);
      console.log("wtf" + analysis);
      const analysisBox = this.createAnalysisBox(analysis, button);
      this.insertAfter(analysisBox, commentsThreadFilterDiv);
    };
    return button;
  }

  createButton(text, className)
  {
    const button = document.createElement("button");
    this.CSSManager.createButtonStyle(button,text,className);
    return button;
  }


  disableButton(button)
  {
    button.disabled = true;
    this.CSSManager.disableButtonStyle(button);
  }

  enableButton(button, buttonText)
  {
    button.disabled = false;
    button.style.backgroundColor = "#0079d3";
    button.textContent = buttonText;
  }

  createAnalysisBox(text, button)
  {
    const analysisBox = document.createElement("div");
    this.CSSManager.createAnalysisBoxStyle(text, analysisBox, button);  
    return analysisBox;
  }

  insertAfter(newElement, referenceElement)
  {
    if (referenceElement.nextSibling)
    {
      referenceElement.parentNode.insertBefore(newElement, referenceElement.nextSibling);
    } else
    {
      referenceElement.parentNode.appendChild(newElement);
    }
  }
}
window.ButtonManager = ButtonManager;
