require('dotenv').config(); // Load environment variables from .env file
const axios = require('axios');
const { WebClient } = require('@slack/web-api');

// Slack Bot Token
const slackToken = 'xoxb-8080424427988-8063389135159-8Su00iNku0L7l9YSDHbqP489'; 
const slackClient = new WebClient(slackToken);

// Function to fetch active sprints from DevRev
async function fetchDevRevSprints() {
  try {
    const settings = {
      method: 'GET',
      url: 'https://api.devrev.ai/internal/vistas.groups.list?group_object_type=work&state=active',
      headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${process.env.DEVREV_AUTH_TOKEN}` // DevRev API token
      }
    };

    const response = await axios(settings);
    console.log('DevRev API Response:', response.data);

    // Check if the response contains vista_group and is an array
    if (!Array.isArray(response.data.vista_group)) {
      console.error('No valid sprint data found in the response.');
      return;
    }

    const sprints = response.data.vista_group || [];
    const activeSprintCount = sprints.length;

    // Log the full sprints array to check for duplicates or unexpected data
    console.log("Sprints Array:", JSON.stringify(sprints, null, 2));

    if (activeSprintCount > 0) {
      console.log(`Found ${activeSprintCount} active sprints.`);

      // Post details of each sprint to Slack
      for (const sprint of sprints) {
        const sprintName = sprint.name;
        
        // Log each sprint's name and data to ensure correct iteration
        console.log(`Processing sprint: ${sprintName}`);
        console.log('Sprint Data:', JSON.stringify(sprint, null, 2));

        // Create message format with dynamically fetched data
        const message = formatSprintMessage(sprint);
        
        // Post message to Slack
        await postMessageToSlack('sprint', message);
      }
    } else {
      console.log('No active sprints found in DevRev.');
    }
  } catch (error) {
    console.error('Error fetching DevRev sprints:', error.message);
    if (error.response) console.error('Details:', error.response.data);
  }
}

// Predefined sentences for different aspects of each sprint
const whatWentWellSentences = [
    "All major features were completed on time with smooth collaboration across teams.",
    "The integration with the third-party services went as planned, resulting in a successful deployment.",
    "New user interface improvements were highly appreciated by stakeholders after testing.",
    "The onboarding process for new team members was smooth, with quick adaptation to workflows."
  ];
  
  const whatWentWrongSentences = [
    "Unexpected database latency issues delayed key tasks in the sprint.",
    "API changes caused delays due to unforeseen integration issues.",
    "Miscommunications around user interface requirements resulted in some rework.",
    "Instability in the testing environment caused delays in QA testing."
  ];
  
  const retrospectiveInsightsSentences = [
    "Focus on writing automated tests earlier in the process to reduce pressure at the end.",
    "Ensure dependencies from external teams are locked down well in advance to avoid blockers.",
    "Improve the efficiency of daily stand-ups to maintain team alignment.",
    "Allocate more time for database testing to prevent similar issues in future sprints."
  ];
  
  
  // Function to get random message from predefined sentences
  function getRandomMessage(sentences) {
    return sentences[Math.floor(Math.random() * sentences.length)];
  }
  // Function to get random message from predefined sentences
function getRandomMessage(sentences) {
    return sentences[Math.floor(Math.random() * sentences.length)];
  }
  
  // Format the sprint message with parent sprint name, detailed cycle info, and a summary
  function formatSprintMessage(sprint) {
      const parentSprintName = sprint.parent?.name || "No parent sprint name available.";
    
      // Prepare the list of cycles (features or issues) inside the sprint
      let cyclesDetails = "";
      let sprintHighlights = ""; // Holds the key summary for the sprint
      let blockers = ""; // Holds all blockers for the sprint
      let retrospectiveInsights = ""; // Holds all retrospective insights for the sprint
      let incompleteSprints = 0; // Track incomplete sprints
      let completedSprints = 0; // Track completed sprints
      let activeSprintCount = 0; // Track active sprints
    
      const inferredParts = sprint.inferred_parts || [];
    
      // Active sprints are now set to the number of cycles present in the sprint
      activeSprintCount = inferredParts.length;
    
      let allCyclesCompleted = true; // Track if all cycles in a sprint are completed
      let hasIncompleteCycle = false; // Track if the sprint has any incomplete cycle
    
      // Iterate through each cycle to gather the required information and count incomplete sprints
      inferredParts.forEach((cycle, index) => {
        const cycleName = cycle.name || `Cycle ${index + 1}`;
        const cycleOwner = cycle.owned_by?.map(owner => owner.display_name).join(", ") || "No owner assigned";
        const cycleStage = cycle.stage?.name || "No stage information";
    
        // Adding cycle details to the message
        cyclesDetails += `\n\n*Cycle ${index + 1} - ${cycleName}:*\n` +
                         `- *Owner(s):* ${cycleOwner}\n` +
                         `- *Stage:* ${cycleStage}\n`;
    
        // Collect random predefined messages for this cycle
        const whatWentWell = getRandomMessage(whatWentWellSentences);
        const whatWentWrong = getRandomMessage(whatWentWrongSentences);
        const retrospective = getRandomMessage(retrospectiveInsightsSentences);
    
        // Collect key information for sprint summary
        if (whatWentWell && !sprintHighlights) sprintHighlights = whatWentWell;
        if (whatWentWrong && !blockers) blockers = whatWentWrong;
        if (retrospective && !retrospectiveInsights) retrospectiveInsights = retrospective;
    
        cyclesDetails += `- *What went well:* ${whatWentWell}\n` +
                         `- *What went wrong:* ${whatWentWrong}\n` +
                         `- *Retrospective insights:* ${retrospective}\n`;
    
        // Check if the cycle is completed or incomplete
        if (cycleStage !== "Completed") {
          hasIncompleteCycle = true; // Mark if this cycle is incomplete
        }
        if (cycleStage === "Completed") {
          allCyclesCompleted = allCyclesCompleted && true; // Continue being completed if all cycles are completed
        } else {
          allCyclesCompleted = false; // If any cycle is incomplete, set it to false
        }
      });
    
      // Update sprint counts based on cycle completion status
      if (allCyclesCompleted) {
        completedSprints++; // Increment completed sprints if all cycles are "Completed"
      }
    
      if (hasIncompleteCycle) {
        incompleteSprints++; // Increment incomplete sprints if there's any incomplete cycle
      }
    
      // Create a brief summary of the sprint
      const sprintSummary = `
      *Sprint Summary for ${parentSprintName}:*\n\n
      *Key Highlights:* ${sprintHighlights || "No major highlights."}\n
      *Key Blockers/Issues:* ${blockers || "No major blockers or issues."}\n
      *Top Retrospective Insights:* ${retrospectiveInsights || "No major insights."}
      `;
    
      // Return formatted message with active, completed, and incomplete sprint counts
      const sprintCountMessage = `Active Sprints: ${activeSprintCount}, Completed Sprints: ${completedSprints}, Incomplete Sprints: ${incompleteSprints}`;
    
      return sprintSummary + `\n\n*Cycles Inside Sprint:*\n${cyclesDetails || "No cycles available."}\n\n${sprintCountMessage}`;
  }
  

// Function to fetch the channel ID from Slack by name
async function getChannelId(channelName) {
  try {
    const result = await slackClient.conversations.list();
    console.log('Slack Response:', result); // Log full response
    if (result.channels) {
      for (const channel of result.channels) {
        if (channel.name === channelName) {
          console.log(`Channel ID for "${channelName}": ${channel.id}`);
          return channel.id;
        }
      }
    }
    console.error(`Channel "${channelName}" not found.`);
    return null;
  } catch (error) {
    console.error('Error fetching Slack channels:', error);
    if (error.response) {
      console.error('Slack API Response Error:', error.response.data);
    }
    return null;
  }
}

// Function to post a message to a Slack channel
async function postMessageToSlack(channelName, message) {
  try {
    const channelId = await getChannelId(channelName);
    if (!channelId) {
      console.error(`Cannot send message. Channel "${channelName}" not found.`);
      return;
    }

    const result = await slackClient.chat.postMessage({
      channel: channelId,
      text: message,
    });
    console.log('Message sent successfully:', result.ts);
  } catch (error) {
    console.error('Error posting message to Slack:', error);
    if (error.response) {
      console.error('Slack API Response Error:', error.response.data);
    }
  }
}

// Start the process by fetching sprints from DevRev
fetchDevRevSprints();
