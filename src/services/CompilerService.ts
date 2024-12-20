// src/services/CompilerService.ts

import { CompilationResult, CompilerInput, ServiceError } from '../utils/types';
const solc = require('solc');
import * as fs from 'fs';
import * as path from 'path';
import logger from '../utils/Logger';

export class CompilerService {
  private static findImports(importPath: string) {
    if (importPath.startsWith('@')) {
      try {
        const nodeModulesPath = path.join(process.cwd(), 'node_modules', importPath);
        return { contents: fs.readFileSync(nodeModulesPath, 'utf8') };
      } catch (e) {
        return { error: 'File not found' };
      }
    }
    try {
      return { contents: fs.readFileSync(importPath, 'utf8') };
    } catch {
      return { error: 'File not found' };
    }
  }

  static async compile(filePath: string, contractName: string): Promise<CompilationResult> {
    try {
      const source = fs.readFileSync(filePath, 'utf8');
      const fileName = path.basename(filePath);
      
      logger.info('Compiling contract', { fileName, contractName });

      const input: CompilerInput = {
        language: 'Solidity',
        sources: {
          [fileName]: { content: source },
        },
        settings: {
          optimizer: { enabled: true, runs: 200 },
          outputSelection: {
            '*': { '*': ['*'] },
          },
        },
      };

      const output = JSON.parse(
        solc.compile(JSON.stringify(input), { import: this.findImports })
      );

      if (output.errors?.length > 0) {
        const hasError = output.errors.some((e: any) => e.severity === 'error');
        if (hasError) {
          logger.error('Compilation errors detected', { errors: output.errors });
          const serviceError = new ServiceError(
            'Compilation failed: ' + JSON.stringify(output.errors, null, 2)
          );
          serviceError.code = 'COMPILATION_FAILED';
          serviceError.statusCode = 500;
          throw serviceError;
        }
        logger.warn('Compilation warnings', { warnings: output.errors });
      }

      logger.info('Contract compiled successfully', { fileName, contractName });
      const contract = output.contracts[fileName][contractName];
      if (!contract) {
        const serviceError = new ServiceError(
          `Contract ${contractName} not found in ${fileName}`
        );
        serviceError.code = 'CONTRACT_NOT_FOUND';
        serviceError.statusCode = 404;
        throw serviceError;
      }

      return {
        abi: contract.abi,
        bytecode: contract.evm.bytecode.object,
      };
    } catch (error) {
      logger.error('Compilation failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        fileName: path.basename(filePath),
        contractName 
      });
      if ((error as ServiceError).code) {
        throw error;
      }
      const serviceError = new ServiceError(`Compilation failed: ${error}`);
      serviceError.code = 'COMPILATION_ERROR';
      serviceError.statusCode = 500;
      throw serviceError;
    }
  }
}