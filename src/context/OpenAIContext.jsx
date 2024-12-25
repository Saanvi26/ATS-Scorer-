import React, { useState, createContext, useContext,useEffect } from "react";
import PropTypes from 'prop-types';
import useOpenAI from '../hooks/useOpenAI';
import { validateApiKey, storeApiKey, removeApiKey, getApiKey } from '../utils/apiKeyUtils';

/** 
 * @typedef {Object} OpenAIContextValue
 * @property {Object|null} client - The OpenAI client instance
 * @property {Error|null} error - Any error that occurred during initialization
 * @property {boolean} isLoading - Loading state of the client
 * @property {boolean} isClientReady - Whether the client is ready to use
 * @property {boolean} hasValidKey - Whether there is a valid API key
 * @property {string|null} apiKeyError - Specific error message for API key issues
 * @property {boolean} isFirstTimeUser - Whether the user hasn't set up an API key yet
 * @property {boolean} isSettingsModalOpen - Whether the settings modal is open
 * @property {Function} openSettingsModal - Function to open the settings modal
 * @property {Function} closeSettingsModal - Function to close the settings modal
 * @property {Function} reinitializeClient - Function to reinitialize the client
 * @property {Function} getCurrentApiKey - Function to get the current API key
 * @property {Function} validateStoredKey - Function to validate the stored key
 * @property {Function} addApiKey - Function to add a new API key
 * @property {Function} removeApiKey - Function to remove the API key
 */
/** @type {React.Context<OpenAIContextValue>} */
const OpenAIContext =createContext(null);


export const OpenAIProvider = ({ children }) => {
  const openAI = useOpenAI();
  const [hasValidKey, setHasValidKey] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(true);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const validateStoredKey = async () => {
    try {
      const key = getApiKey();
      if (!key) {
        setHasValidKey(false);
        return false;
      }
      const isValid = validateApiKey(key);
      setHasValidKey(isValid);
      return isValid;
    } catch (error) {
      console.error('Error validating stored key:', error);
      setHasValidKey(false);
      return false;
    }
  };

  const openSettingsModal = () => setIsSettingsModalOpen(true);
  const closeSettingsModal = () => {
    if (hasValidKey) {
      setIsSettingsModalOpen(false);
    }
  };

  useEffect(() => {
    const checkFirstTimeUser = async () => {
      const key = getApiKey();
      setIsFirstTimeUser(!key);
      if (!key) {
        setIsSettingsModalOpen(true);
      }
    };
    checkFirstTimeUser();
  }, []);
  const value = {
    client: openAI.client,
    error: openAI.error,
    isLoading: openAI.isLoading,
    isClientReady: openAI.isClientReady,
    hasValidKey,
    isFirstTimeUser,
    isSettingsModalOpen,
    openSettingsModal,
    closeSettingsModal,
    apiKeyError: openAI.error?.name === 'ApiKeyError' ? openAI.error.message : null,
    reinitializeClient: openAI.reinitializeClient,
    getCurrentApiKey: openAI.getCurrentApiKey,
    validateStoredKey,
    addApiKey: async (key) => {
      try {
        await storeApiKey(key);
        await validateStoredKey();
        await openAI.reinitializeClient();
        setIsFirstTimeUser(false);
        if (hasValidKey) {
          setIsSettingsModalOpen(false);
        }
      } catch (error) {
        console.error('Error adding API key:', error);
        throw error;
      }
    },
    removeApiKey: async () => {
      try {
        const currentKey = openAI.getCurrentApiKey();
        if (currentKey) {
          await removeApiKey(currentKey);
          await validateStoredKey();
          await openAI.reinitializeClient();
          setIsFirstTimeUser(true);
          setIsSettingsModalOpen(true);
        }
      } catch (error) {
        console.error('Error removing API key:', error);
        throw error;
      }
    }
  };
  return (
    <OpenAIContext.Provider value={value}>
      {children}
    </OpenAIContext.Provider>
  );
};

OpenAIProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export const useOpenAIContext = () => {
  const context = useContext(OpenAIContext);
  if (!context) {
    throw new Error('useOpenAIContext must be used within an OpenAIProvider');
  }
  return context;
};

export default OpenAIContext;