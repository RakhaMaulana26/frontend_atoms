import React from 'react';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import type { User } from '../../../types';

interface TokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  token: string;
  isGenerating: boolean;
  isSending: boolean;
  onCopyToken: () => void;
  onSendEmail: () => void;
}

const TokenModal: React.FC<TokenModalProps> = ({
  isOpen,
  onClose,
  user,
  token,
  isGenerating,
  isSending,
  onCopyToken,
  onSendEmail,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Activation Token" size="md">
      <div className="space-y-4">
        {user && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">User:</span> {user.name}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Email:</span> {user.email}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Activation Code
          </label>
          {isGenerating ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#222E6A]"></div>
            </div>
          ) : token ? (
            <div className="relative">
              <input
                type="text"
                value={token}
                readOnly
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white font-mono text-lg text-center tracking-wider"
              />
              <button
                onClick={onCopyToken}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-sm bg-[#222E6A] text-white rounded hover:bg-[#1a2452] transition-colors"
              >
                Copy
              </button>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Failed to generate token. Please try again.
              </p>
            </div>
          )}
        </div>

        {token && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              This code will expire in <span className="font-semibold">7 days</span>.
              Share it with the user to activate their account.
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          {token && (
            <Button
              variant="primary"
              onClick={onSendEmail}
              isLoading={isSending}
              disabled={isSending}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Send via Email
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default TokenModal;
