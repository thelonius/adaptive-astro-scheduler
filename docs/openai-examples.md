# OpenAI Integration Examples

This document provides examples of how to use the OpenAI integration for generating astrological scheduling rules.

## Setup

First, ensure you have set your OpenAI API key in the backend `.env` file:

```env
OPENAI_API_KEY=your_api_key_here
```

## Basic Rule Generation

### Example 1: Meeting Times

**Request:**
```http
POST /api/llm/generate-rule
Content-Type: application/json

{
  "natalChartId": "65abc123def456789",
  "request": "Suggest the best times for important business meetings"
}
```

**Generated Rule:**
```json
{
  "name": "Optimal Meeting Times",
  "description": "Schedule important meetings when Mercury and Sun are well-aspected in professional houses",
  "conditions": [
    {
      "type": "transit",
      "planet": "Mercury",
      "house": 10,
      "operator": "in",
      "value": "10th house"
    },
    {
      "type": "transit",
      "aspect": "Trine",
      "operator": "aspects",
      "value": "natal Mercury"
    }
  ],
  "actions": [
    {
      "type": "suggest_time",
      "priority": 9,
      "metadata": {
        "activity": "business_meeting",
        "timeRange": "morning",
        "reason": "Mercury in 10th house with harmonious aspects favors communication"
      }
    }
  ]
}
```

### Example 2: Creative Work

**Request:**
```json
{
  "natalChartId": "65abc123def456789",
  "request": "When should I schedule creative and artistic activities?"
}
```

**Generated Rule:**
```json
{
  "name": "Creative Activity Timing",
  "description": "Optimal times for artistic and creative pursuits",
  "conditions": [
    {
      "type": "transit",
      "planet": "Venus",
      "house": 5,
      "operator": "in",
      "value": "5th house"
    },
    {
      "type": "transit",
      "planet": "Moon",
      "sign": "Pisces",
      "operator": "in",
      "value": "Pisces"
    }
  ],
  "actions": [
    {
      "type": "suggest_time",
      "priority": 8,
      "metadata": {
        "activity": "creative_work",
        "timeRange": "afternoon",
        "reason": "Venus in 5th enhances creativity, Moon in Pisces adds imagination"
      }
    }
  ]
}
```

### Example 3: Avoid Times

**Request:**
```json
{
  "natalChartId": "65abc123def456789",
  "request": "When should I avoid making important decisions?"
}
```

**Generated Rule:**
```json
{
  "name": "Decision-Making Caution",
  "description": "Times to avoid making important decisions",
  "conditions": [
    {
      "type": "transit",
      "planet": "Mercury",
      "operator": "equals",
      "value": "retrograde"
    }
  ],
  "actions": [
    {
      "type": "avoid_time",
      "priority": 10,
      "metadata": {
        "activity": "important_decisions",
        "reason": "Mercury retrograde can cause miscommunication and confusion"
      }
    }
  ]
}
```

## Advanced Examples

### Example 4: Complex Financial Decisions

**Request:**
```json
{
  "natalChartId": "65abc123def456789",
  "request": "Help me time major financial investments and purchases based on my 2nd and 8th house transits"
}
```

**Generated Rule:**
```json
{
  "name": "Financial Investment Timing",
  "description": "Optimal windows for major financial decisions",
  "conditions": [
    {
      "type": "transit",
      "planet": "Jupiter",
      "house": 2,
      "operator": "in",
      "value": "2nd house"
    },
    {
      "type": "transit",
      "planet": "Venus",
      "aspect": "Trine",
      "operator": "aspects",
      "value": "natal Venus"
    },
    {
      "type": "transit",
      "planet": "Saturn",
      "house": 8,
      "operator": "in",
      "value": "not in 8th house"
    }
  ],
  "actions": [
    {
      "type": "suggest_time",
      "priority": 9,
      "metadata": {
        "activity": "financial_investment",
        "reason": "Jupiter in 2nd house with harmonious Venus aspects supports growth"
      }
    }
  ]
}
```

### Example 5: Relationship Activities

**Request:**
```json
{
  "natalChartId": "65abc123def456789",
  "request": "Best times for romantic dates and relationship discussions"
}
```

**Generated Rule:**
```json
{
  "name": "Romantic Timing",
  "description": "Favorable times for romance and relationship building",
  "conditions": [
    {
      "type": "transit",
      "planet": "Venus",
      "house": 7,
      "operator": "in",
      "value": "7th house"
    },
    {
      "type": "transit",
      "planet": "Moon",
      "aspect": "Sextile",
      "operator": "aspects",
      "value": "natal Venus"
    }
  ],
  "actions": [
    {
      "type": "suggest_time",
      "priority": 7,
      "metadata": {
        "activity": "romantic_date",
        "timeRange": "evening",
        "reason": "Venus in 7th house enhances partnership energy"
      }
    }
  ]
}
```

## Explaining Rules

You can also ask the AI to explain an existing rule in simple terms:

**Request:**
```http
GET /api/llm/explain-rule/65abc123def456789
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "explanation": "This rule helps you schedule creative activities at times when your astrological chart is most supportive. Specifically, it looks for when Venus (the planet of beauty and art) is moving through your 5th house (the house of creativity and self-expression). During these times, your creative abilities are naturally enhanced, making it an ideal time for artistic work, hobbies, or any creative projects."
  }
}
```

## Prompt Engineering Tips

### Good Prompts

✅ **Specific and detailed:**
```
"Suggest times for public speaking engagements based on my Mercury and 3rd house placements"
```

✅ **Activity-focused:**
```
"When should I schedule deep work and concentration-intensive tasks?"
```

✅ **Astrologically informed:**
```
"Help me identify favorable times for travel based on my 9th house and Jupiter transits"
```

### Less Effective Prompts

❌ **Too vague:**
```
"Tell me about my chart"
```

❌ **Not scheduling-related:**
```
"What's my personality like?"
```

❌ **Too complex:**
```
"Give me a complete life plan for the next 10 years"
```

## Custom Prompt Templates

You can create templates for common requests:

### Template 1: Work Activities
```
"Suggest optimal times for [ACTIVITY] considering my natal [PLANET] in [SIGN/HOUSE]"
```

### Template 2: Avoidance Rules
```
"When should I avoid [ACTIVITY] based on challenging transits to my natal [PLANET]?"
```

### Template 3: House-Based
```
"Help me schedule [ACTIVITY] based on transits through my [HOUSE] house"
```

## Integration in Frontend

Here's how to use the rule generator in your React app:

```typescript
import { useState } from 'react';
import apiService from '../services/api';

function RuleGenerator({ chartId }: { chartId: string }) {
  const [request, setRequest] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedRule, setGeneratedRule] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await apiService.generateRule(chartId, request);
      setGeneratedRule(response.data.data);
    } catch (error) {
      console.error('Error generating rule:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <textarea
        value={request}
        onChange={(e) => setRequest(e.target.value)}
        placeholder="Describe the scheduling rule you want..."
      />
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Rule'}
      </button>
      {generatedRule && (
        <div>
          <h3>{generatedRule.name}</h3>
          <p>{generatedRule.description}</p>
        </div>
      )}
    </div>
  );
}
```

## Cost Considerations

- Each rule generation call uses OpenAI's API and incurs costs
- GPT-4 is more expensive but provides better astrological interpretations
- Consider implementing caching for similar requests
- Set up usage monitoring and limits

## Error Handling

Common errors and solutions:

### OpenAI API Key Not Configured
```json
{
  "status": "error",
  "message": "OpenAI API key not configured"
}
```
**Solution:** Add `OPENAI_API_KEY` to backend `.env` file

### Invalid JSON Response
**Solution:** The AI sometimes returns markdown. The service automatically extracts JSON from code blocks.

### Rate Limiting
**Solution:** Implement request queuing and retry logic

## Best Practices

1. **Start with simple requests** to understand the AI's output
2. **Provide context** about the natal chart in your request
3. **Review generated rules** before activating them
4. **Test rules** with small date ranges first
5. **Combine AI rules** with manually created ones
6. **Track outcomes** to improve future prompts
7. **Use specific astrological terms** for better results

## Future Enhancements

- Fine-tuned model specifically for astrology
- Multi-turn conversations for rule refinement
- Learning from outcome data
- Personalized prompt suggestions
- Rule templates library

---

**Last Updated:** January 2026
